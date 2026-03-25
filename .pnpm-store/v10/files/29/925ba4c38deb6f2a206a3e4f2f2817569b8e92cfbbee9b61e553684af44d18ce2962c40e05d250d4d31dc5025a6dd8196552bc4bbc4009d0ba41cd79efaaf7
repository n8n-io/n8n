/**
Extend fix range to prevent changes from other rules.
https://github.com/eslint/eslint/pull/13748/files#diff-c692f3fde09eda7c89f1802c908511a3fb59f5d207fe95eb009cb52e46a99e84R348

@param {ruleFixer} fixer - The fixer to fix.
@param {int[]} range - The extended range node.
*/
export default function * extendFixRange(fixer, range) {
	yield fixer.insertTextBeforeRange(range, '');
	yield fixer.insertTextAfterRange(range, '');
}
