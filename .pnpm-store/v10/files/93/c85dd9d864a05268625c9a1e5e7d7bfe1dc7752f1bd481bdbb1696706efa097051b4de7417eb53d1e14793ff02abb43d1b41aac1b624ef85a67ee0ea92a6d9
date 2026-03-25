/* eslint-disable no-console */
import commander from "commander";
import {glob} from "glob";
import {exists, mkdir, readdir, readFile, stat, writeFile} from "mz/fs";
import {dirname, join, relative} from "path";

import { transform} from "./index";











export default function run() {
  commander
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

  if (commander.project) {
    if (
      commander.outDir ||
      commander.transforms ||
      commander.args[0] ||
      commander.enableLegacyTypescriptModuleInterop
    ) {
      console.error(
        "If TypeScript project is specified, out directory, transforms, source " +
          "directory, and --enable-legacy-typescript-module-interop may not be specified.",
      );
      process.exit(1);
    }
  } else {
    if (!commander.outDir) {
      console.error("Out directory is required");
      process.exit(1);
    }

    if (!commander.transforms) {
      console.error("Transforms option is required.");
      process.exit(1);
    }

    if (!commander.args[0]) {
      console.error("Source directory is required.");
      process.exit(1);
    }
  }

  const options = {
    outDirPath: commander.outDir,
    srcDirPath: commander.args[0],
    project: commander.project,
    outExtension: commander.outExtension,
    excludeDirs: commander.excludeDirs ? commander.excludeDirs.split(",") : [],
    quiet: commander.quiet,
    sucraseOptions: {
      transforms: commander.transforms ? commander.transforms.split(",") : [],
      disableESTransforms: commander.disableEsTransforms,
      jsxRuntime: commander.jsxRuntime,
      production: commander.production,
      jsxImportSource: commander.jsxImportSource,
      jsxPragma: commander.jsxPragma || "React.createElement",
      jsxFragmentPragma: commander.jsxFragmentPragma || "React.Fragment",
      keepUnusedImports: commander.keepUnusedImports,
      preserveDynamicImport: commander.preserveDynamicImport,
      injectCreateRequireForImportRequire: commander.injectCreateRequireForImportRequire,
      enableLegacyTypeScriptModuleInterop: commander.enableLegacyTypescriptModuleInterop,
      enableLegacyBabel5ModuleInterop: commander.enableLegacyBabel5ModuleInterop,
    },
  };

  buildDirectory(options).catch((e) => {
    process.exitCode = 1;
    console.error(e);
  });
}






async function findFiles(options) {
  const outDirPath = options.outDirPath;
  const srcDirPath = options.srcDirPath;

  const extensions = options.sucraseOptions.transforms.includes("typescript")
    ? [".ts", ".tsx"]
    : [".js", ".jsx"];

  if (!(await exists(outDirPath))) {
    await mkdir(outDirPath);
  }

  const outArr = [];
  for (const child of await readdir(srcDirPath)) {
    if (["node_modules", ".git"].includes(child) || options.excludeDirs.includes(child)) {
      continue;
    }
    const srcChildPath = join(srcDirPath, child);
    const outChildPath = join(outDirPath, child);
    if ((await stat(srcChildPath)).isDirectory()) {
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
  const tsConfigPath = join(options.project, "tsconfig.json");

  let str;
  try {
    str = await readFile(tsConfigPath, "utf8");
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

  const absProject = join(process.cwd(), options.project);
  const outDirs = [];

  if (!(await exists(options.outDirPath))) {
    await mkdir(options.outDirPath);
  }

  if (files) {
    for (const file of files) {
      if (file.endsWith(".d.ts")) {
        continue;
      }
      if (!file.endsWith(".ts") && !file.endsWith(".js")) {
        continue;
      }

      const srcFile = join(absProject, file);
      const outFile = join(options.outDirPath, file);
      const outPath = outFile.replace(/\.\w+$/, `.${options.outExtension}`);

      const outDir = dirname(outPath);
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
      const globFiles = await glob(join(absProject, pattern));
      for (const file of globFiles) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) {
          continue;
        }
        if (file.endsWith(".d.ts")) {
          continue;
        }

        const relativeFile = relative(absProject, file);
        const outFile = join(options.outDirPath, relativeFile);
        const outPath = outFile.replace(/\.\w+$/, `.${options.outExtension}`);

        const outDir = dirname(outPath);
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
    if (!(await exists(outDirPath))) {
      await mkdir(outDirPath);
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

  const tsConfigPath = join(options.project, "tsconfig.json");

  let str;
  try {
    str = await readFile(tsConfigPath, "utf8");
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
    options.outDirPath = join(process.cwd(), options.project, compilerOpts.outDir);
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
  const code = (await readFile(srcPath)).toString();
  const transformedCode = transform(code, {...options.sucraseOptions, filePath: srcPath}).code;
  await writeFile(outPath, transformedCode);
}
