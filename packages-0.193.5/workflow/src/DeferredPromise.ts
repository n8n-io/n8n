// From: https://gist.github.com/compulim/8b49b0a744a3eeb2205e2b9506201e50
export interface IDeferredPromise<T> {
	promise: () => Promise<T>;
	reject: (error: Error) => void;
	resolve: (result: T) => void;
}

export async function createDeferredPromise<T>(): Promise<IDeferredPromise<T>> {
	return new Promise<IDeferredPromise<T>>((resolveCreate) => {
		const promise = new Promise<T>((resolve, reject) => {
			resolveCreate({ promise: async () => promise, resolve, reject });
		});
	});
}
