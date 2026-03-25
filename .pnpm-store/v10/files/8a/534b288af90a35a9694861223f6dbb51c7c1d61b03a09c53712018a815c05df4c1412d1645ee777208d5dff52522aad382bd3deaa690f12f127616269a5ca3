'use strict'
const _ = require('lodash')
module.exports = {
    /**
     * Returns the lodash object settings, with default values if missing
     * @param context
     * @returns {LodashSettings}
     */
    getSettings(context) {
        return _.chain(context)
            .get(['settings', 'lodash'])
            .clone()
            .defaults({
                version: 4
            })
            .value()
    },

    /**
     * Gets whether the ecmaFeature specified is on for the context
     * @param context
     * @param {string} featureName
     */
    isEcmaFeatureOn(context, featureName) {
        return _.get(context, ['ecmaFeatures', featureName]) || (_.get(context, ['languageOptions', 'parserOptions', 'ecmaVersion'], 0) > 5)
    }
}

/**
 @typedef {Object} LodashSettings
 @property {String} pragma - The symbol that signifies Lodash (default is '_').
 @property {Number} version - The major version number (default is 4).
*/