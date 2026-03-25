'use strict';

class PLazy extends Promise {
	constructor(executor) {
		super(resolve => {
			resolve();
		});

		this._executor = executor;
	}

	static from(fn) {
		return new PLazy(resolve => {
			resolve(fn());
		});
	}

	static resolve(value) {
		return new PLazy(resolve => {
			resolve(value);
		});
	}

	static reject(error) {
		return new PLazy((resolve, reject) => {
			reject(error);
		});
	}

	then(onFulfilled, onRejected) {
		this._promise = this._promise || new Promise(this._executor);
		// eslint-disable-next-line promise/prefer-await-to-then
		return this._promise.then(onFulfilled, onRejected);
	}

	catch(onRejected) {
		this._promise = this._promise || new Promise(this._executor);
		return this._promise.catch(onRejected);
	}
}

module.exports = PLazy;
