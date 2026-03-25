#!/usr/bin/env node

const {existsSync} = require(`fs`);
const {createRequire} = require(`module`);
const {resolve} = require(`path`);

const relPnpApiPath = "../../../../.pnp.cjs";

const absPnpApiPath = resolve(__dirname, relPnpApiPath);
const absRequire = createRequire(absPnpApiPath);

const moduleWrapper = tsserver => {
  if (!process.versions.pnp) {
    return tsserver;
  }

  const {isAbsolute} = require(`path`);
  const pnpApi = require(`pnpapi`);

  const isVirtual = str => str.match(/\/(\$\$virtual|__virtual__)\//);
  const isPortal = str => str.startsWith("portal:/");
  const normalize = str => str.replace(/\\/g, `/`).replace(/^\/?/, `/`);

  const dependencyTreeRoots = new Set(pnpApi.getDependencyTreeRoots().map(locator => {
    return `${locator.name}@${locator.reference}`;
  }));

  // VSCode sends the zip paths to TS using the "zip://" prefix, that TS
  // doesn't understand. This layer makes sure to remove the protocol
  // before forwarding it to TS, and to add it back on all returned paths.

  function toEditorPath(str) {
    // We add the `zip:` prefix to both `.zip/` paths and virtual paths
    if (isAbsolute(str) && !str.match(/^\^?(zip:|\/zip\/)/) && (str.match(/\.zip\//) || isVirtual(str))) {
      // We also take the opportunity to turn virtual paths into physical ones;
      // this makes it much easier to work with workspaces that list peer
      // dependencies, since otherwise Ctrl+Click would bring us to the virtual
      // file instances instead of the real ones.
      //
      // We only do this to modules owned by the the dependency tree roots.
      // This avoids breaking the resolution when jumping inside a vendor
      // with peer dep (otherwise jumping into react-dom would show resolution
      // errors on react).
      //
      const resolved = isVirtual(str) ? pnpApi.resolveVirtual(str) : str;
      if (resolved) {
        const locator = pnpApi.findPackageLocator(resolved);
        if (locator && (dependencyTreeRoots.has(`${locator.name}@${locator.reference}`) || isPortal(locator.reference))) {
          str = resolved;
        }
      }

      str = normalize(str);

      if (str.match(/\.zip\//)) {
        switch (hostInfo) {
          // Absolute VSCode `Uri.fsPath`s need to start with a slash.
          // VSCode only adds it automatically for supported schemes,
          // so we have to do it manually for the `zip` scheme.
          // The path needs to start with a caret otherwise VSCode doesn't handle the protocol
          //
          // Ref: https://github.com/microsoft/vscode/issues/105014#issuecomment-686760910
          //
          // 2021-10-08: VSCode changed the format in 1.61.
          // Before | ^zip:/c:/foo/bar.zip/package.json
          // After  | ^/zip//c:/foo/bar.zip/package.json
          //
          // 2022-04-06: VSCode changed the format in 1.66.
          // Before | ^/zip//c:/foo/bar.zip/package.json
          // After  | ^/zip/c:/foo/bar.zip/package.json
          //
          // 2022-05-06: VSCode changed the format in 1.68
          // Before | ^/zip/c:/foo/bar.zip/package.json
          // After  | ^/zip//c:/foo/bar.zip/package.json
          //
          case `vscode <1.61`: {
            str = `^zip:${str}`;
          } break;

          case `vscode <1.66`: {
            str = `^/zip/${str}`;
          } break;

          case `vscode <1.68`: {
            str = `^/zip${str}`;
          } break;

          case `vscode`: {
            str = `^/zip/${str}`;
          } break;

          // To make "go to definition" work,
          // We have to resolve the actual file system path from virtual path
          // and convert scheme to supported by [vim-rzip](https://github.com/lbrayner/vim-rzip)
          case `coc-nvim`: {
            str = normalize(resolved).replace(/\.zip\//, `.zip::`);
            str = resolve(`zipfile:${str}`);
          } break;

          // Support neovim native LSP and [typescript-language-server](https://github.com/theia-ide/typescript-language-server)
          // We have to resolve the actual file system path from virtual path,
          // everything else is up to neovim
          case `neovim`: {
            str = normalize(resolved).replace(/\.zip\//, `.zip::`);
            str = `zipfile://${str}`;
          } break;

          default: {
            str = `zip:${str}`;
          } break;
        }
      } else {
        str = str.replace(/^\/?/, process.platform === `win32` ? `` : `/`);
      }
    }

    return str;
  }

  function fromEditorPath(str) {
    switch (hostInfo) {
      case `coc-nvim`: {
        str = str.replace(/\.zip::/, `.zip/`);
        // The path for coc-nvim is in format of /<pwd>/zipfile:/<pwd>/.yarn/...
        // So in order to convert it back, we use .* to match all the thing
        // before `zipfile:`
        return process.platform === `win32`
          ? str.replace(/^.*zipfile:\//, ``)
          : str.replace(/^.*zipfile:/, ``);
      } break;

      case `neovim`: {
        str = str.replace(/\.zip::/, `.zip/`);
        // The path for neovim is in format of zipfile:///<pwd>/.yarn/...
        return str.replace(/^zipfile:\/\//, ``);
      } break;

      case `vscode`:
      default: {
        return str.replace(/^\^?(zip:|\/zip(\/ts-nul-authority)?)\/+/, process.platform === `win32` ? `` : `/`)
      } break;
    }
  }

  // Force enable 'allowLocalPluginLoads'
  // TypeScript tries to resolve plugins using a path relative to itself
  // which doesn't work when using the global cache
  // https://github.com/microsoft/TypeScript/blob/1b57a0395e0bff191581c9606aab92832001de62/src/server/project.ts#L2238
  // VSCode doesn't want to enable 'allowLocalPluginLoads' due to security concerns but
  // TypeScript already does local loads and if this code is running the user trusts the workspace
  // https://github.com/microsoft/vscode/issues/45856
  const ConfiguredProject = tsserver.server.ConfiguredProject;
  const {enablePluginsWithOptions: originalEnablePluginsWithOptions} = ConfiguredProject.prototype;
  ConfiguredProject.prototype.enablePluginsWithOptions = function() {
    this.projectService.allowLocalPluginLoads = true;
    return originalEnablePluginsWithOptions.apply(this, arguments);
  };

  // And here is the point where we hijack the VSCode <-> TS communications
  // by adding ourselves in the middle. We locate everything that looks
  // like an absolute path of ours and normalize it.

  const Session = tsserver.server.Session;
  const {onMessage: originalOnMessage, send: originalSend} = Session.prototype;
  let hostInfo = `unknown`;

  Object.assign(Session.prototype, {
    onMessage(/** @type {string | object} */ message) {
      const isStringMessage = typeof message === 'string';
      const parsedMessage = isStringMessage ? JSON.parse(message) : message;

      if (
        parsedMessage != null &&
        typeof parsedMessage === `object` &&
        parsedMessage.arguments &&
        typeof parsedMessage.arguments.hostInfo === `string`
      ) {
        hostInfo = parsedMessage.arguments.hostInfo;
        if (hostInfo === `vscode` && process.env.VSCODE_IPC_HOOK) {
          const [, major, minor] = (process.env.VSCODE_IPC_HOOK.match(
            // The RegExp from https://semver.org/ but without the caret at the start
            /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
          ) ?? []).map(Number)

          if (major === 1) {
            if (minor < 61) {
              hostInfo += ` <1.61`;
            } else if (minor < 66) {
              hostInfo += ` <1.66`;
            } else if (minor < 68) {
              hostInfo += ` <1.68`;
            }
          }
        }
      }

      const processedMessageJSON = JSON.stringify(parsedMessage, (key, value) => {
        return typeof value === 'string' ? fromEditorPath(value) : value;
      });

      return originalOnMessage.call(
        this,
        isStringMessage ? processedMessageJSON : JSON.parse(processedMessageJSON)
      );
    },

    send(/** @type {any} */ msg) {
      return originalSend.call(this, JSON.parse(JSON.stringify(msg, (key, value) => {
        return typeof value === `string` ? toEditorPath(value) : value;
      })));
    }
  });

  return tsserver;
};

if (existsSync(absPnpApiPath)) {
  if (!process.versions.pnp) {
    // Setup the environment to be able to require typescript/lib/tsserverlibrary.js
    require(absPnpApiPath).setup();
  }
}

// Defer to the real typescript/lib/tsserverlibrary.js your application uses
module.exports = moduleWrapper(absRequire(`typescript/lib/tsserverlibrary.js`));
