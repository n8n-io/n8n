// This file should be ES5 compatible
/* eslint prefer-spread:0, no-var:0, prefer-reflect:0, no-magic-numbers:0 */
"use strict";

module.exports = function() {
	// Import Events
	var events = require("events");

	// Export Domain
	var domain = {};
	domain.createDomain = domain.create = function() {
		var d = new events.EventEmitter();

		function emitError(e) {
			d.emit("error", e);
		}

		d.add = function(emitter) {
			emitter.on("error", emitError);
		};
		d.remove = function(emitter) {
			emitter.removeListener("error", emitError);
		};
		d.bind = function(fn) {
			return function() {
				var args = Array.prototype.slice.call(arguments);
				try {
					fn.apply(null, args);
				} catch (err) {
					emitError(err);
				}
			};
		};
		d.intercept = function(fn) {
			return function(err) {
				if (err) {
					emitError(err);
				} else {
					var args = Array.prototype.slice.call(arguments, 1);
					try {
						fn.apply(null, args);
					} catch (err) {
						emitError(err);
					}
				}
			};
		};
		d.run = function(fn) {
			try {
				fn();
			} catch (err) {
				emitError(err);
			}
			return this;
		};
		d.dispose = function() {
			this.removeAllListeners();
			return this;
		};
		d.enter = d.exit = function() {
			return this;
		};
		return d;
	};
	return domain;
}.call(this);
