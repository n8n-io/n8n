// The return value is a mixin of `subprocess` and `Promise`
export const mergePromise = (subprocess, promise) => {
	for (const [property, descriptor] of descriptors) {
		const value = descriptor.value.bind(promise);
		Reflect.defineProperty(subprocess, property, {...descriptor, value});
	}
};

// eslint-disable-next-line unicorn/prefer-top-level-await
const nativePromisePrototype = (async () => {})().constructor.prototype;

const descriptors = ['then', 'catch', 'finally'].map(property => [
	property,
	Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property),
]);
