/**
 * Jest global teardown - plain JS to bypass Jest's transform system.
 */
module.exports = async () => {
	const stack = globalThis.__TESTCONTAINERS_STACK__;
	if (stack) {
		await stack.stop();
		console.log('\n✓ Testcontainers stack stopped\n');
	}
};
