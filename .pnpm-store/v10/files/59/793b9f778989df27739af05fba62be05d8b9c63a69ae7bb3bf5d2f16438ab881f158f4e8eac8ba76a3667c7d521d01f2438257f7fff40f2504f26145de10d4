/**
 * We have a collection of typescript functions that we need to run in the browser.
 * First, we build them into a single js file
 * Second, due to framework differences we need to get our script content as a string to avoid pathing issues due to file routing in frameworks like Next.js
 * Playwright allows us to pass in script content directly as a string instead of reading a file from a path
 * https://github.com/browserbase/stagehand/issues/180
 *
 * We can't rely on the normal build process for stagehand, because we need our script content as a string so that the import *just works*
 */
import fs from "fs";
import path from "path";
import esbuild from "esbuild";

fs.mkdirSync(path.join(__dirname, "./build"), { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(__dirname, "index.ts")],
  bundle: true,
  outdir: path.join(__dirname, "build"),
});

const scriptContent = fs.readFileSync(
  path.join(__dirname, "./build/index.js"),
  "utf8",
);

const output = `export const scriptContent = ${JSON.stringify(scriptContent)};`;

fs.writeFileSync(path.join(__dirname, "./build/scriptContent.ts"), output);
