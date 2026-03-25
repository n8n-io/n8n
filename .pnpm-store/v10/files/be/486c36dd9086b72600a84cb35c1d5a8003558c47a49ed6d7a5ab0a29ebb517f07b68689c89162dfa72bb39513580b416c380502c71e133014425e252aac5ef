// When the `shell` option is set, any command argument is concatenated as a single string by Node.js:
// https://github.com/nodejs/node/blob/e38ce27f3ca0a65f68a31cedd984cddb927d4002/lib/child_process.js#L614-L624
// However, since Node 24, it also prints a deprecation warning.
// To avoid this warning, we perform that same operation before calling `node:child_process`.
// Shells only understand strings, which is why Node.js performs that concatenation.
// However, we rely on users splitting command arguments as an array.
// For example, this allows us to easily detect which arguments are passed.
// So we do want users to pass array of arguments even with `shell: true`, but we also want to avoid any warning.
export const concatenateShell = (file, commandArguments, options) => options.shell && commandArguments.length > 0
	? [[file, ...commandArguments].join(' '), [], options]
	: [file, commandArguments, options];
