const Logger = require('./logger');

/**
 * Determines if a given URL is valid.
 *
 * @param url
 *
 * @returns {Boolean}
 */
exports.isValidURL = function (url) {
  const regex = '^http(s?)\\:\\/\\/[0-9a-zA-Z]([-.\\w]*[0-9a-zA-Z@:])*(:(0-9)*)*(\\/?)([a-zA-Z0-9\\-\\.\\?\\,\\&\\(\\)\\/\\\\\\+&%\\$#_=@]*)?$';
  if (!url.match(regex)) {
    Logger.getInstance().debug('The provided URL is not a valid URL. URL: %s', url);
    return false;
  }
  return true;
};

/**
 * Encodes the given URL. 
 * 
 * @param {String} url 
 * 
 * @returns {String} the encoded URL
 */
exports.urlEncode = function (url) { 
  /** The encodeURIComponent() method encodes special characters including: , / ? : @ & = + $ #
     but escapes space as %20B. Replace with + for consistency across drivers. */
  return encodeURIComponent(url).replace(/%20/g, '+');
};