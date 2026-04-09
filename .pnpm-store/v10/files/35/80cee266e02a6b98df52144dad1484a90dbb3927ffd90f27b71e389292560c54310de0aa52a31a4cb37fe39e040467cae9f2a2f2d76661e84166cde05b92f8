"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }/* eslint-disable no-console */
var _commander = require('commander'); var _commander2 = _interopRequireDefault(_commander);
var _tinyglobby = require('tinyglobby');
var _fs = require('mz/fs');
var _path = require('path');

var _index = require('./index');











 function run() {
  _commander2.default
    .description(`Sucrase: super-fast Babel alternative.`)
    .usage("[options] <srcDir>")
    .option(
      "-d, --out-dir <out>",
      "Compile an input directory of modules into an output directory.",
    )
    .option(
      "-p, --project <dir>",
      "Compile a TypeScript project, will read from tsconfig.json in <dir>",
    )
    .option("--out-extension <extension>", "File extension to use for all output files.", "js")
    .option("--exclude-dirs <paths>", "Names of directories that should not be traversed.")
    .option("-q, --quiet", "Don't print the names of converted files.")
    .option("-t, --transforms <transforms>", "Comma-separated list of transforms to run.")
    .option("--disable-es-transforms", "Opt out of all ES syntax transforms.")
    .option("--jsx-runtime <string>", "Transformation mode for the JSX transform.")
    .option("--production", "Disable debugging information from JSX in output.")
    .option(
      "--jsx-import-source <string>",
      "Automatic JSX transform import path prefix, defaults to `React.Fragment`.",
    )
    .option(
      "--jsx-pragma <string>",
      "Classic JSX transform element creation function, defaults to `React.createElement`.",
    )
    .option(
      "--jsx-fragment-pragma <string>",
      "Classic JSX transform fragment component, defaults to `React.Fragment`.",
    )
    .option("--keep-unused-imports", "Disable automatic removal of type-only imports/exports.")
    .option("--preserve-dynamic-import", "Don't transpile dynamic import() to require.")
    .option(
      "--inject-create-require-for-import-require",
      "Use `createRequire` when transpiling TS `import = require` to ESM.",
    )
    .option(
      "--enable-legacy-typescript-module-interop",
      "Use default TypeScript ESM/CJS interop strategy.",
    )
    .option("--enable-legacy-babel5-module-interop", "Use Babel 5 ESM/CJS interop strategy.")
    .parse(process.argv);

  if (_commander2.default.project) {
    if (
      _commander2.default.outDir ||
      _commander2.default.transforms ||
      _commander2.default.args[0] ||
      _commander2.default.enableLegacyTypescriptModuleInterop
    ) {
      console.error(
        "If TypeScript project is specified, out directory, transforms, source " +
          "directory, and --enable-legacy-typescript-module-interop may not be specified.",
      );
      process.exit(1);
    }
  } else {
    if (!_commander2.default.outDir) {
      console.error("Out directory is required");
      process.exit(1);
    }

    if (!_commander2.default.transforms) {
      console.error("Transforms option is required.");
      process.exit(1);
    }

    if (!_commander2.default.args[0]) {
      console.error("Source directory is required.");
      process.exit(1);
    }
  }

  const options = {
    outDirPath: _commander2.default.outDir,
    srcDirPath: _commander2.default.args[0],
    project: _commander2.default.project,
    outExtension: _commander2.default.outExtension,
    excludeDirs: _commander2.default.excludeDirs ? _commander2.default.excludeDirs.split(",") : [],
    quiet: _commander2.default.quiet,
    sucraseOptions: {
      transforms: _commander2.default.transforms ? _commander2.default.transforms.split(",") : [],
      disableESTransforms: _commander2.default.disableEsTransforms,
      jsxRuntime: _commander2.default.jsxRuntime,
      production: _commander2.default.production,
      jsxImportSource: _commander2.default.jsxImportSource,
      jsxPragma: _commander2.default.jsxPragma || "React.createElement",
      jsxFragmentPragma: _commander2.default.jsxFragmentPragma || "React.Fragment",
      keepUnusedImports: _commander2.default.keepUnusedImports,
      preserveDynamicImport: _commander2.default.preserveDynamicImport,
      injectCreateRequireForImportRequire: _commander2.default.injectCreateRequireForImportRequire,
      enableLegacyTypeScriptModuleInterop: _commander2.default.enableLegacyTypescriptModuleInterop,
      enableLegacyBabel5ModuleInterop: _commander2.default.enableLegacyBabel5ModuleInterop,
    },
  };

  buildDirectory(options).catch((e) => {
    process.exitCode = 1;
    console.error(e);
  });
} exports.default = run;






async function findFiles(options) {
  const outDirPath = options.outDirPath;
  const srcDirPath = options.srcDirPath;

  const extensions = options.sucraseOptions.transforms.includes("typescript")
    ? [".ts", ".tsx"]
    : [".js", ".jsx"];

  if (!(await _fs.exists.call(void 0, outDirPath))) {
    await _fs.mkdir.call(void 0, outDirPath);
  }

  const outArr = [];
  for (const child of await _fs.readdir.call(void 0, srcDirPath)) {
    if (["node_modules", ".git"].includes(child) || options.excludeDirs.includes(child)) {
      continue;
    }
    const srcChildPath = _path.join.call(void 0, srcDirPath, child);
    const outChildPath = _path.join.call(void 0, outDirPath, child);
    if ((await _fs.stat.call(void 0, srcChildPath)).isDirectory()) {
      const innerOptions = {...options};
      innerOptions.srcDirPath = srcChildPath;
      innerOptions.outDirPath = outChildPath;
      const innerFiles = await findFiles(innerOptions);
      outArr.push(...innerFiles);
    } else if (extensions.some((ext) => srcChildPath.endsWith(ext))) {
      const outPath = outChildPath.replace(/\.\w+$/, `.${options.outExtension}`);
      outArr.push({
        srcPath: srcChildPath,
        outPath,
      });
    }
  }

  return outArr;
}

async function runGlob(options) {
  const tsConfigPath = _path.join.call(void 0, options.project, "tsconfig.json");

  let str;
  try {
    str = await _fs.readFile.call(void 0, tsConfigPath, "utf8");
  } catch (err) {
    console.error("Could not find project tsconfig.json");
    console.error(`  --project=${options.project}`);
    console.error(err);
    process.exit(1);
  }
  const json = JSON.parse(str);

  const foundFiles = [];

  const files = json.files;
  const include = json.include;

  const absProject = _path.join.call(void 0, process.cwd(), options.project);
  const outDirs = [];

  if (!(await _fs.exists.call(void 0, options.outDirPath))) {
    await _fs.mkdir.call(void 0, options.outDirPath);
  }

  if (files) {
    for (const file of files) {
      if (file.endsWith(".d.ts")) {
        continue;
      }
      if (!file.endsWith(".ts") && !file.endsWith(".js")) {
        continue;
      }

      const srcFile = _path.join.call(void 0, absProject, file);
      const outFile = _path.join.call(void 0, options.outDirPath, file);
      const outPath = outFile.replace(/\.\w+$/, `.${options.outExtension}`);

      const outDir = _path.dirname.call(void 0, outPath);
      if (!outDirs.includes(outDir)) {
        outDirs.push(outDir);
      }

      foundFiles.push({
        srcPath: srcFile,
        outPath,
      });
    }
  }
  if (include) {
    for (const pattern of include) {
      const globFiles = await _tinyglobby.glob.call(void 0, _path.join.call(void 0, absProject, pattern), {expandDirectories: false});
      for (const file of globFiles) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) {
          continue;
        }
        if (file.endsWith(".d.ts")) {
          continue;
        }

        const relativeFile = _path.relative.call(void 0, absProject, file);
        const outFile = _path.join.call(void 0, options.outDirPath, relativeFile);
        const outPath = outFile.replace(/\.\w+$/, `.${options.outExtension}`);

        const outDir = _path.dirname.call(void 0, outPath);
        if (!outDirs.includes(outDir)) {
          outDirs.push(outDir);
        }

        foundFiles.push({
          srcPath: file,
          outPath,
        });
      }
    }
  }

  for (const outDirPath of outDirs) {
    if (!(await _fs.exists.call(void 0, outDirPath))) {
      await _fs.mkdir.call(void 0, outDirPath);
    }
  }

  // TODO: read exclude

  return foundFiles;
}

async function updateOptionsFromProject(options) {
  /**
   * Read the project information and assign the following.
   *  - outDirPath
   *  - transform: imports
   *  - transform: typescript
   *  - enableLegacyTypescriptModuleInterop: true/false.
   */

  const tsConfigPath = _path.join.call(void 0, options.project, "tsconfig.json");

  let str;
  try {
    str = await _fs.readFile.call(void 0, tsConfigPath, "utf8");
  } catch (err) {
    console.error("Could not find project tsconfig.json");
    console.error(`  --project=${options.project}`);
    console.error(err);
    process.exit(1);
  }
  const json = JSON.parse(str);
  const sucraseOpts = options.sucraseOptions;
  if (!sucraseOpts.transforms.includes("typescript")) {
    sucraseOpts.transforms.push("typescript");
  }

  const compilerOpts = json.compilerOptions;
  if (compilerOpts.outDir) {
    options.outDirPath = _path.join.call(void 0, process.cwd(), options.project, compilerOpts.outDir);
  }
  if (compilerOpts.esModuleInterop !== true) {
    sucraseOpts.enableLegacyTypeScriptModuleInterop = true;
  }
  if (compilerOpts.module === "commonjs") {
    if (!sucraseOpts.transforms.includes("imports")) {
      sucraseOpts.transforms.push("imports");
    }
  }
}

async function buildDirectory(options) {
  let files;
  if (options.outDirPath && options.srcDirPath) {
    files = await findFiles(options);
  } else if (options.project) {
    await updateOptionsFromProject(options);
    files = await runGlob(options);
  } else {
    console.error("Project or Source directory required.");
    process.exit(1);
  }

  for (const file of files) {
    await buildFile(file.srcPath, file.outPath, options);
  }
}

async function buildFile(srcPath, outPath, options) {
  if (!options.quiet) {
    console.log(`${srcPath} -> ${outPath}`);
  }
  const code = (await _fs.readFile.call(void 0, srcPath)).toString();
  const transformedCode = _index.transform.call(void 0, code, {...options.sucraseOptions, filePath: srcPath}).code;
  await _fs.writeFile.call(void 0, outPath, transformedCode);
}
