import { createCommandAndArgs } from "./create-command-and-args.js";
async function toStream(dot, options) {
  const [command, args] = createCommandAndArgs(options ?? {});
  const cp = new Deno.Command(command, {
    args,
    stdin: "piped",
    stdout: "piped"
  }).spawn();
  const stdin = cp.stdin?.getWriter();
  await stdin.write(new TextEncoder().encode(dot));
  await stdin.close();
  return cp.stdout;
}
function open(path) {
  try {
    return Deno.open(path, { write: true });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return Deno.open(path, { createNew: true, write: true });
    }
    throw e;
  }
}
async function toFile(dot, path, options) {
  const output = await open(path);
  const stream = await toStream(dot, options);
  await stream.pipeTo(output.writable);
}
export {
  toFile,
  toStream
};
