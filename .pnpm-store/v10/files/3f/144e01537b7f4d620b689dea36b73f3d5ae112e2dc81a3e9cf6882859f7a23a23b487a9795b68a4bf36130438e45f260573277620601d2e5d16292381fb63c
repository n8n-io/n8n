export const createDeferred = () => {
	const methods = {};
	const promise = new Promise((resolve, reject) => {
		Object.assign(methods, {resolve, reject});
	});
	return Object.assign(promise, methods);
};
