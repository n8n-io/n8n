
const EMPTY = {};
const HOP = Object.prototype.hasOwnProperty;

let fns = {
	/**  let cachedFn = memoize(originalFn); */
	memoize(fn, opt=EMPTY) {
		let cache = opt.cache || {};
		return function(...a) {
			let k = String(a[0]);
			if (opt.caseSensitive===false) k = k.toLowerCase();
			return HOP.call(cache,k) ? cache[k] : (cache[k] = fn.apply(this, a));
		};
	},

	/** let throttled = debounce(10, console.log); */
	debounce(fn, opts) {
		if (typeof opts==='function') { let p = fn; fn = opts; opts = p; }
		let delay = opts && opts.delay || opts || 0,
			args, context, timer;
		return function(...a) {
			args = a;
			context = this;
			if (!timer) timer = setTimeout( () => {
				fn.apply(context, args);
				args = context = timer = null;
			}, delay);
		};
	},

	bind(target, key, { value: fn }) {
		return {
			configurable: true,
			get() {
				let value = fn.bind(this);
				Object.defineProperty(this, key, {
					value,
					configurable: true,
					writable: true
				});
				return value;
			}
		};
	}
};


let memoize = multiMethod(fns.memoize),
	debounce = multiMethod(fns.debounce),
	bind = multiMethod((f,c)=>f.bind(c), ()=>fns.bind);

export { memoize, debounce, bind };
export default { memoize, debounce, bind };


/** Creates a function that supports the following calling styles:
 *	d() - returns an unconfigured decorator
 *	d(opts) - returns a configured decorator
 *	d(fn, opts) - returns a decorated proxy to `fn`
 *	d(target, key, desc) - the decorator itself
 *
 *	@Example:
 *		// simple identity deco:
 *		let d = multiMethod( fn => fn );
 *
 *		class Foo {
 *			@d
 *			bar() { }
 *
 *			@d()
 *			baz() { }
 *
 *			@d({ opts })
 *			bat() { }
 *
 *			bap = d(() => {})
 *		}
 */
function multiMethod(inner, deco) {
	deco = deco || inner.decorate || decorator(inner);
	let d = deco();
	return (...args) => {
		let l = args.length;
		return (l<2 ? deco : (l>2 ? d : inner))(...args);
	};
}

/** Returns function supports the forms:
 *	deco(target, key, desc) -> decorate a method
 *	deco(Fn) -> call the decorator proxy on a function
 */
function decorator(fn) {
	return opt => (
		typeof opt==='function' ? fn(opt) : (target, key, desc) => {
			desc.value = fn(desc.value, opt, target, key, desc);
		}
	);
}
