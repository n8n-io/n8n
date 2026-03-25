'use strict';

const {Script} = require('vm');
const {
	lookupCompiler,
	removeShebang
} = require('./compiler');
const {
	transformer
} = require('./transformer');

const objectDefineProperties = Object.defineProperties;

const MODULE_PREFIX = '(function (exports, require, module, __filename, __dirname) { ';
const STRICT_MODULE_PREFIX = MODULE_PREFIX + '"use strict"; ';
const MODULE_SUFFIX = '\n});';

/**
 * Class Script
 *
 * @public
 */
class VMScript {

	/**
	 * The script code with wrapping. If set will invalidate the cache.<br>
	 * Writable only for backwards compatibility.
	 *
	 * @public
	 * @readonly
	 * @member {string} code
	 * @memberOf VMScript#
	 */

	/**
	 * The filename used for this script.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {string} filename
	 * @memberOf VMScript#
	 */

	/**
	 * The line offset use for stack traces.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {number} lineOffset
	 * @memberOf VMScript#
	 */

	/**
	 * The column offset use for stack traces.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {number} columnOffset
	 * @memberOf VMScript#
	 */

	/**
	 * The compiler to use to get the JavaScript code.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {(string|compileCallback)} compiler
	 * @memberOf VMScript#
	 */

	/**
	 * The prefix for the script.
	 *
	 * @private
	 * @member {string} _prefix
	 * @memberOf VMScript#
	 */

	/**
	 * The suffix for the script.
	 *
	 * @private
	 * @member {string} _suffix
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the VM or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledVM
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the NodeVM or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledNodeVM
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the NodeVM in strict mode or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledNodeVMStrict
	 * @memberOf VMScript#
	 */

	/**
	 * The resolved compiler to use to get the JavaScript code.
	 *
	 * @private
	 * @readonly
	 * @member {compileCallback} _compiler
	 * @memberOf VMScript#
	 */

	/**
	 * The script to run without wrapping.
	 *
	 * @private
	 * @member {string} _code
	 * @memberOf VMScript#
	 */

	/**
	 * Whether or not the script contains async functions.
	 *
	 * @private
	 * @member {boolean} _hasAsync
	 * @memberOf VMScript#
	 */

	/**
	 * Create VMScript instance.
	 *
	 * @public
	 * @param {string} code - Code to run.
	 * @param {(string|Object)} [options] - Options map or filename.
	 * @param {string} [options.filename="vm.js"] - Filename that shows up in any stack traces produced from this script.
	 * @param {number} [options.lineOffset=0] - Passed to vm.Script options.
	 * @param {number} [options.columnOffset=0] - Passed to vm.Script options.
	 * @param {(string|compileCallback)} [options.compiler="javascript"] - The compiler to use.
	 * @throws {VMError} If the compiler is unknown or if coffee-script was requested but the module not found.
	 */
	constructor(code, options) {
		const sCode = `${code}`;
		let useFileName;
		let useOptions;
		if (arguments.length === 2) {
			if (typeof options === 'object') {
				useOptions = options || {__proto__: null};
				useFileName = useOptions.filename;
			} else {
				useOptions = {__proto__: null};
				useFileName = options;
			}
		} else if (arguments.length > 2) {
			// We do it this way so that there are no more arguments in the function.
			// eslint-disable-next-line prefer-rest-params
			useOptions = arguments[2] || {__proto__: null};
			useFileName = options || useOptions.filename;
		} else {
			useOptions = {__proto__: null};
		}

		const {
			compiler = 'javascript',
			compilerOptions,
			lineOffset = 0,
			columnOffset = 0
		} = useOptions;

		// Throw if the compiler is unknown.
		const resolvedCompiler = lookupCompiler(compiler, compilerOptions);

		objectDefineProperties(this, {
			__proto__: null,
			code: {
				__proto__: null,
				// Put this here so that it is enumerable, and looks like a property.
				get() {
					return this._prefix + this._code + this._suffix;
				},
				set(value) {
					const strNewCode = String(value);
					if (strNewCode === this._code && this._prefix === '' && this._suffix === '') return;
					this._code = strNewCode;
					this._prefix = '';
					this._suffix = '';
					this._compiledVM = null;
					this._compiledNodeVM = null;
					this._compiledCode = null;
				},
				enumerable: true
			},
			filename: {
				__proto__: null,
				value: useFileName || 'vm.js',
				enumerable: true
			},
			lineOffset: {
				__proto__: null,
				value: lineOffset,
				enumerable: true
			},
			columnOffset: {
				__proto__: null,
				value: columnOffset,
				enumerable: true
			},
			compiler: {
				__proto__: null,
				value: compiler,
				enumerable: true
			},
			compilerOptions: {
				__proto__: null,
				value: compilerOptions,
				enumerable: true
			},
			_code: {
				__proto__: null,
				value: sCode,
				writable: true
			},
			_prefix: {
				__proto__: null,
				value: '',
				writable: true
			},
			_suffix: {
				__proto__: null,
				value: '',
				writable: true
			},
			_compiledVM: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledNodeVM: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledNodeVMStrict: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledCode: {
				__proto__: null,
				value: null,
				writable: true
			},
			_hasAsync: {
				__proto__: null,
				value: false,
				writable: true
			},
			_compiler: {__proto__: null, value: resolvedCompiler}
		});
	}

	/**
	 * Wraps the code.<br>
	 * This will replace the old wrapping.<br>
	 * Will invalidate the code cache.
	 *
	 * @public
	 * @deprecated Since v3.9.0. Wrap your code before passing it into the VMScript object.
	 * @param {string} prefix - String that will be appended before the script code.
	 * @param {script} suffix - String that will be appended behind the script code.
	 * @return {this} This for chaining.
	 * @throws {TypeError} If prefix or suffix is a Symbol.
	 */
	wrap(prefix, suffix) {
		const strPrefix = `${prefix}`;
		const strSuffix = `${suffix}`;
		if (this._prefix === strPrefix && this._suffix === strSuffix) return this;
		this._prefix = strPrefix;
		this._suffix = strSuffix;
		this._compiledVM = null;
		this._compiledNodeVM = null;
		this._compiledNodeVMStrict = null;
		return this;
	}

	/**
	 * Compile this script. <br>
	 * This is useful to detect syntax errors in the script.
	 *
	 * @public
	 * @return {this} This for chaining.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	compile() {
		this._compileVM();
		return this;
	}

	/**
	 * Get the compiled code.
	 *
	 * @private
	 * @return {string} The code.
	 */
	getCompiledCode() {
		if (!this._compiledCode) {
			const comp = this._compiler(this._prefix + removeShebang(this._code) + this._suffix, this.filename);
			const res = transformer(null, comp, false, false, this.filename);
			this._compiledCode = res.code;
			this._hasAsync = res.hasAsync;
		}
		return this._compiledCode;
	}

	/**
	 * Compiles this script to a vm.Script.
	 *
	 * @private
	 * @param {string} prefix - JavaScript code that will be used as prefix.
	 * @param {string} suffix - JavaScript code that will be used as suffix.
	 * @return {vm.Script} The compiled vm.Script.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compile(prefix, suffix) {
		return new Script(prefix + this.getCompiledCode() + suffix, {
			__proto__: null,
			filename: this.filename,
			displayErrors: false,
			lineOffset: this.lineOffset,
			columnOffset: this.columnOffset
		});
	}

	/**
	 * Will return the cached version of the script intended for VM or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileVM() {
		let script = this._compiledVM;
		if (!script) {
			this._compiledVM = script = this._compile('', '');
		}
		return script;
	}

	/**
	 * Will return the cached version of the script intended for NodeVM or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileNodeVM() {
		let script = this._compiledNodeVM;
		if (!script) {
			this._compiledNodeVM = script = this._compile(MODULE_PREFIX, MODULE_SUFFIX);
		}
		return script;
	}

	/**
	 * Will return the cached version of the script intended for NodeVM in strict mode or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileNodeVMStrict() {
		let script = this._compiledNodeVMStrict;
		if (!script) {
			this._compiledNodeVMStrict = script = this._compile(STRICT_MODULE_PREFIX, MODULE_SUFFIX);
		}
		return script;
	}

}

exports.MODULE_PREFIX = MODULE_PREFIX;
exports.STRICT_MODULE_PREFIX = STRICT_MODULE_PREFIX;
exports.MODULE_SUFFIX = MODULE_SUFFIX;
exports.VMScript = VMScript;
