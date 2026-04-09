"use strict";
module.exports = ReflectionObject;

ReflectionObject.className = "ReflectionObject";

const OneOf = require("./oneof");
var util = require("./util");

var Root; // cyclic

/* eslint-disable no-warning-comments */
// TODO: Replace with embedded proto.
var editions2023Defaults = {enum_type: "OPEN", field_presence: "EXPLICIT", json_format: "ALLOW", message_encoding: "LENGTH_PREFIXED", repeated_field_encoding: "PACKED", utf8_validation: "VERIFY"};
var proto2Defaults = {enum_type: "CLOSED", field_presence: "EXPLICIT", json_format: "LEGACY_BEST_EFFORT", message_encoding: "LENGTH_PREFIXED", repeated_field_encoding: "EXPANDED", utf8_validation: "NONE"};
var proto3Defaults = {enum_type: "OPEN", field_presence: "IMPLICIT", json_format: "ALLOW", message_encoding: "LENGTH_PREFIXED", repeated_field_encoding: "PACKED", utf8_validation: "VERIFY"};

/**
 * Constructs a new reflection object instance.
 * @classdesc Base class of all reflection objects.
 * @constructor
 * @param {string} name Object name
 * @param {Object.<string,*>} [options] Declared options
 * @abstract
 */
function ReflectionObject(name, options) {

    if (!util.isString(name))
        throw TypeError("name must be a string");

    if (options && !util.isObject(options))
        throw TypeError("options must be an object");

    /**
     * Options.
     * @type {Object.<string,*>|undefined}
     */
    this.options = options; // toJSON

    /**
     * Parsed Options.
     * @type {Array.<Object.<string,*>>|undefined}
     */
    this.parsedOptions = null;

    /**
     * Unique name within its namespace.
     * @type {string}
     */
    this.name = name;

    /**
     * The edition specified for this object.  Only relevant for top-level objects.
     * @type {string}
     * @private
     */
    this._edition = null;

    /**
     * The default edition to use for this object if none is specified.  For legacy reasons,
     * this is proto2 except in the JSON parsing case where it was proto3.
     * @type {string}
     * @private
     */
    this._defaultEdition = "proto2";

    /**
     * Resolved Features.
     * @type {object}
     * @private
     */
    this._features = {};

    /**
     * Whether or not features have been resolved.
     * @type {boolean}
     * @private
     */
    this._featuresResolved = false;

    /**
     * Parent namespace.
     * @type {Namespace|null}
     */
    this.parent = null;

    /**
     * Whether already resolved or not.
     * @type {boolean}
     */
    this.resolved = false;

    /**
     * Comment text, if any.
     * @type {string|null}
     */
    this.comment = null;

    /**
     * Defining file name.
     * @type {string|null}
     */
    this.filename = null;
}

Object.defineProperties(ReflectionObject.prototype, {

    /**
     * Reference to the root namespace.
     * @name ReflectionObject#root
     * @type {Root}
     * @readonly
     */
    root: {
        get: function() {
            var ptr = this;
            while (ptr.parent !== null)
                ptr = ptr.parent;
            return ptr;
        }
    },

    /**
     * Full name including leading dot.
     * @name ReflectionObject#fullName
     * @type {string}
     * @readonly
     */
    fullName: {
        get: function() {
            var path = [ this.name ],
                ptr = this.parent;
            while (ptr) {
                path.unshift(ptr.name);
                ptr = ptr.parent;
            }
            return path.join(".");
        }
    }
});

/**
 * Converts this reflection object to its descriptor representation.
 * @returns {Object.<string,*>} Descriptor
 * @abstract
 */
ReflectionObject.prototype.toJSON = /* istanbul ignore next */ function toJSON() {
    throw Error(); // not implemented, shouldn't happen
};

/**
 * Called when this object is added to a parent.
 * @param {ReflectionObject} parent Parent added to
 * @returns {undefined}
 */
ReflectionObject.prototype.onAdd = function onAdd(parent) {
    if (this.parent && this.parent !== parent)
        this.parent.remove(this);
    this.parent = parent;
    this.resolved = false;
    var root = parent.root;
    if (root instanceof Root)
        root._handleAdd(this);
};

/**
 * Called when this object is removed from a parent.
 * @param {ReflectionObject} parent Parent removed from
 * @returns {undefined}
 */
ReflectionObject.prototype.onRemove = function onRemove(parent) {
    var root = parent.root;
    if (root instanceof Root)
        root._handleRemove(this);
    this.parent = null;
    this.resolved = false;
};

/**
 * Resolves this objects type references.
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.resolve = function resolve() {
    if (this.resolved)
        return this;
    if (this.root instanceof Root)
        this.resolved = true; // only if part of a root
    return this;
};

/**
 * Resolves this objects editions features.
 * @param {string} edition The edition we're currently resolving for.
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype._resolveFeaturesRecursive = function _resolveFeaturesRecursive(edition) {
    return this._resolveFeatures(this._edition || edition);
};

/**
 * Resolves child features from parent features
 * @param {string} edition The edition we're currently resolving for.
 * @returns {undefined}
 */
ReflectionObject.prototype._resolveFeatures = function _resolveFeatures(edition) {
    if (this._featuresResolved) {
        return;
    }

    var defaults = {};

    /* istanbul ignore if */
    if (!edition) {
        throw new Error("Unknown edition for " + this.fullName);
    }

    var protoFeatures = Object.assign(this.options ? Object.assign({},  this.options.features) : {},
        this._inferLegacyProtoFeatures(edition));

    if (this._edition) {
        // For a namespace marked with a specific edition, reset defaults.
        /* istanbul ignore else */
        if (edition === "proto2") {
            defaults = Object.assign({}, proto2Defaults);
        } else if (edition === "proto3") {
            defaults = Object.assign({}, proto3Defaults);
        } else if (edition === "2023") {
            defaults = Object.assign({}, editions2023Defaults);
        } else {
            throw new Error("Unknown edition: " + edition);
        }
        this._features = Object.assign(defaults, protoFeatures || {});
        this._featuresResolved = true;
        return;
    }

    // fields in Oneofs aren't actually children of them, so we have to
    // special-case it
    /* istanbul ignore else */
    if (this.partOf instanceof OneOf) {
        var lexicalParentFeaturesCopy = Object.assign({}, this.partOf._features);
        this._features = Object.assign(lexicalParentFeaturesCopy, protoFeatures || {});
    } else if (this.declaringField) {
        // Skip feature resolution of sister fields.
    } else if (this.parent) {
        var parentFeaturesCopy = Object.assign({}, this.parent._features);
        this._features = Object.assign(parentFeaturesCopy, protoFeatures || {});
    } else {
        throw new Error("Unable to find a parent for " + this.fullName);
    }
    if (this.extensionField) {
        // Sister fields should have the same features as their extensions.
        this.extensionField._features = this._features;
    }
    this._featuresResolved = true;
};

/**
 * Infers features from legacy syntax that may have been specified differently.
 * in older editions.
 * @param {string|undefined} edition The edition this proto is on, or undefined if pre-editions
 * @returns {object} The feature values to override
 */
ReflectionObject.prototype._inferLegacyProtoFeatures = function _inferLegacyProtoFeatures(/*edition*/) {
    return {};
};

/**
 * Gets an option value.
 * @param {string} name Option name
 * @returns {*} Option value or `undefined` if not set
 */
ReflectionObject.prototype.getOption = function getOption(name) {
    if (this.options)
        return this.options[name];
    return undefined;
};

/**
 * Sets an option.
 * @param {string} name Option name
 * @param {*} value Option value
 * @param {boolean|undefined} [ifNotSet] Sets the option only if it isn't currently set
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.setOption = function setOption(name, value, ifNotSet) {
    if (!this.options)
        this.options = {};
    if (/^features\./.test(name)) {
        util.setProperty(this.options, name, value, ifNotSet);
    } else if (!ifNotSet || this.options[name] === undefined) {
        if (this.getOption(name) !== value) this.resolved = false;
        this.options[name] = value;
    }

    return this;
};

/**
 * Sets a parsed option.
 * @param {string} name parsed Option name
 * @param {*} value Option value
 * @param {string} propName dot '.' delimited full path of property within the option to set. if undefined\empty, will add a new option with that value
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.setParsedOption = function setParsedOption(name, value, propName) {
    if (!this.parsedOptions) {
        this.parsedOptions = [];
    }
    var parsedOptions = this.parsedOptions;
    if (propName) {
        // If setting a sub property of an option then try to merge it
        // with an existing option
        var opt = parsedOptions.find(function (opt) {
            return Object.prototype.hasOwnProperty.call(opt, name);
        });
        if (opt) {
            // If we found an existing option - just merge the property value
            // (If it's a feature, will just write over)
            var newValue = opt[name];
            util.setProperty(newValue, propName, value);
        } else {
            // otherwise, create a new option, set its property and add it to the list
            opt = {};
            opt[name] = util.setProperty({}, propName, value);
            parsedOptions.push(opt);
        }
    } else {
        // Always create a new option when setting the value of the option itself
        var newOpt = {};
        newOpt[name] = value;
        parsedOptions.push(newOpt);
    }

    return this;
};

/**
 * Sets multiple options.
 * @param {Object.<string,*>} options Options to set
 * @param {boolean} [ifNotSet] Sets an option only if it isn't currently set
 * @returns {ReflectionObject} `this`
 */
ReflectionObject.prototype.setOptions = function setOptions(options, ifNotSet) {
    if (options)
        for (var keys = Object.keys(options), i = 0; i < keys.length; ++i)
            this.setOption(keys[i], options[keys[i]], ifNotSet);
    return this;
};

/**
 * Converts this instance to its string representation.
 * @returns {string} Class name[, space, full name]
 */
ReflectionObject.prototype.toString = function toString() {
    var className = this.constructor.className,
        fullName  = this.fullName;
    if (fullName.length)
        return className + " " + fullName;
    return className;
};

/**
 * Converts the edition this object is pinned to for JSON format.
 * @returns {string|undefined} The edition string for JSON representation
 */
ReflectionObject.prototype._editionToJSON = function _editionToJSON() {
    if (!this._edition || this._edition === "proto3") {
        // Avoid emitting proto3 since we need to default to it for backwards
        // compatibility anyway.
        return undefined;
    }
    return this._edition;
};

// Sets up cyclic dependencies (called in index-light)
ReflectionObject._configure = function(Root_) {
    Root = Root_;
};
