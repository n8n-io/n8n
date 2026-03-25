'use strict';

const installPkg = require('@antfu/install-pkg');
const utils = require('@antfu/utils');
const kolorist = require('kolorist');
const loader_warn = require('./warn.cjs');

let pending;
const tasks = {};
async function tryInstallPkg(name, autoInstall) {
  if (pending) {
    await pending;
  }
  if (!tasks[name]) {
    console.log(kolorist.cyan(`Installing ${name}...`));
    if (typeof autoInstall === "function") {
      tasks[name] = pending = autoInstall(name).then(() => utils.sleep(300)).finally(() => {
        pending = void 0;
      });
    } else {
      tasks[name] = pending = installPkg.installPackage(name, {
        dev: true,
        preferOffline: true
      }).then(() => utils.sleep(300)).catch((e) => {
        loader_warn.warnOnce(`Failed to install ${name}`);
        console.error(e);
      }).finally(() => {
        pending = void 0;
      });
    }
  }
  return tasks[name];
}

exports.tryInstallPkg = tryInstallPkg;
