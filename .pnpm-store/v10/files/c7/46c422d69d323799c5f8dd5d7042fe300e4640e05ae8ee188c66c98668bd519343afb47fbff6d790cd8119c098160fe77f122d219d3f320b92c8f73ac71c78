var crypto  = require('crypto');
var xmldom  = require('@xmldom/xmldom');
var xpath   = require('xpath');
var utils   = require('./utils');

const insecureAlgorithms = [
  //https://www.w3.org/TR/xmlenc-core1/#rsav15note
  'http://www.w3.org/2001/04/xmlenc#rsa-1_5',
  //https://csrc.nist.gov/News/2017/Update-to-Current-Use-and-Deprecation-of-TDEA
  'http://www.w3.org/2001/04/xmlenc#tripledes-cbc'];

function encryptKeyInfoWithScheme(symmetricKey, options, scheme, callback) {
  const padding = scheme === 'RSA-OAEP' ? crypto.constants.RSA_PKCS1_OAEP_PADDING : crypto.constants.RSA_PKCS1_PADDING;
  const symmetricKeyBuffer = Buffer.isBuffer(symmetricKey) ? symmetricKey : Buffer.from(symmetricKey, 'utf-8');

  try {
    var encrypted = crypto.publicEncrypt({
      key: options.rsa_pub,
      padding: padding
    }, symmetricKeyBuffer);
    var base64EncodedEncryptedKey = encrypted.toString('base64');

    var params = {
      encryptedKey:  base64EncodedEncryptedKey,
      encryptionPublicCert: '<X509Data><X509Certificate>' + utils.pemToCert(options.pem.toString()) + '</X509Certificate></X509Data>',
      keyEncryptionMethod: options.keyEncryptionAlgorithm
    };

    var result = utils.renderTemplate('keyinfo', params);
    callback(null, result);
  } catch (e) {
    callback(e);
  }
}

function encryptKeyInfo(symmetricKey, options, callback) {
  if (!options)
    return callback(new Error('must provide options'));
  if (!options.rsa_pub)
    return callback(new Error('must provide options.rsa_pub with public key RSA'));
  if (!options.pem)
    return callback(new Error('must provide options.pem with certificate'));

  if (!options.keyEncryptionAlgorithm)
    return callback(new Error('encryption without encrypted key is not supported yet'));
  if (options.disallowEncryptionWithInsecureAlgorithm
    && insecureAlgorithms.indexOf(options.keyEncryptionAlgorithm) >= 0) {
    return callback(new Error('encryption algorithm ' + options.keyEncryptionAlgorithm + 'is not secure'));
  }
  switch (options.keyEncryptionAlgorithm) {
    case 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p':
      return encryptKeyInfoWithScheme(symmetricKey, options, 'RSA-OAEP', callback);

    case 'http://www.w3.org/2001/04/xmlenc#rsa-1_5':
      utils.warnInsecureAlgorithm(options.keyEncryptionAlgorithm, options.warnInsecureAlgorithm);
      return encryptKeyInfoWithScheme(symmetricKey, options, 'RSAES-PKCS1-V1_5', callback);

    default:
      return callback(new Error('encryption key algorithm not supported'));
  }
}

function encrypt(content, options, callback) {
  if (!options)
    return callback(new Error('must provide options'));
  if (!content)
    return callback(new Error('must provide content to encrypt'));
  if (!options.rsa_pub)
    return callback(new Error('rsa_pub option is mandatory and you should provide a valid RSA public key'));
  if (!options.pem)
    return callback(new Error('pem option is mandatory and you should provide a valid x509 certificate encoded as PEM'));
  if (options.disallowEncryptionWithInsecureAlgorithm
    && (insecureAlgorithms.indexOf(options.keyEncryptionAlgorithm) >= 0
      || insecureAlgorithms.indexOf(options.encryptionAlgorithm) >= 0)) {
    return callback(new Error('encryption algorithm ' + options.keyEncryptionAlgorithm + ' is not secure'));
  }
  options.input_encoding = options.input_encoding || 'utf8';

  function generate_symmetric_key(cb) {
    switch (options.encryptionAlgorithm) {
      case 'http://www.w3.org/2001/04/xmlenc#aes128-cbc':
        crypto.randomBytes(16, cb); // generate a symmetric random key 16 bytes length
        break;
      case 'http://www.w3.org/2001/04/xmlenc#aes256-cbc':
        crypto.randomBytes(32, cb); // generate a symmetric random key 32 bytes length
        break;
      case 'http://www.w3.org/2009/xmlenc11#aes128-gcm':
        crypto.randomBytes(16, cb); // generate a symmetric random key 16 bytes length
        break;
      case 'http://www.w3.org/2009/xmlenc11#aes256-gcm':
        crypto.randomBytes(32, cb); // generate a symmetric random key 32 bytes length
        break;
      case 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc':
        utils.warnInsecureAlgorithm(options.encryptionAlgorithm, options.warnInsecureAlgorithm);
        crypto.randomBytes(24, cb); // generate a symmetric random key 24 bytes (192 bits) length
        break;
      default:
        crypto.randomBytes(32, cb); // generate a symmetric random key 32 bytes length
    }
  }

  function encrypt_content(symmetricKey, cb) {
    switch (options.encryptionAlgorithm) {
      case 'http://www.w3.org/2001/04/xmlenc#aes128-cbc':
        encryptWithAlgorithm('aes-128-cbc', symmetricKey, 16, content, options.input_encoding, function (err, encryptedContent) {
          if (err) return cb(err);
          cb(null, encryptedContent);
        });
        break;
      case 'http://www.w3.org/2001/04/xmlenc#aes256-cbc':
        encryptWithAlgorithm('aes-256-cbc', symmetricKey, 16, content, options.input_encoding, function (err, encryptedContent) {
          if (err) return cb(err);
          cb(null, encryptedContent);
        });
        break;
      case 'http://www.w3.org/2009/xmlenc11#aes128-gcm':
        encryptWithAlgorithm('aes-128-gcm', symmetricKey, 12, content, options.input_encoding, function (err, encryptedContent) {
          if (err) return cb(err);
          cb(null, encryptedContent);
        });
        break;
      case 'http://www.w3.org/2009/xmlenc11#aes256-gcm':
        encryptWithAlgorithm('aes-256-gcm', symmetricKey, 12, content, options.input_encoding, function (err, encryptedContent) {
          if (err) return cb(err);
          cb(null, encryptedContent);
        });
        break;
      case 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc':
        utils.warnInsecureAlgorithm(options.encryptionAlgorithm, options.warnInsecureAlgorithm);
        encryptWithAlgorithm('des-ede3-cbc', symmetricKey, 8, content, options.input_encoding, function (err, encryptedContent) {
          if (err) return cb(err);
          cb(null, encryptedContent);
        });
        break;
      default:
        cb(new Error('encryption algorithm not supported'));
    }
  }

  function encrypt_key(symmetricKey, encryptedContent, cb) {
    encryptKeyInfo(symmetricKey, options, function(err, keyInfo) {
      if (err) return cb(err);
      var result = utils.renderTemplate('encrypted-key', {
        encryptedContent: encryptedContent.toString('base64'),
        keyInfo: keyInfo,
        contentEncryptionMethod: options.encryptionAlgorithm
      });

      cb(null, result);
    });
  }


  generate_symmetric_key(function (genKeyError, symmetricKey) {
    if (genKeyError) {
      return callback(genKeyError);
    }

    encrypt_content(symmetricKey, function(encryptContentError, encryptedContent) {
      if (encryptContentError) {
        return callback(encryptContentError);
      }

      encrypt_key(symmetricKey, encryptedContent, function (encryptKeyError, result) {
        if (encryptKeyError) {
          return callback(encryptKeyError);
        }

        callback(null, result);
      });

    });

  });
}

function decrypt(xml, options, callback) {
  if (!options)
    return callback(new Error('must provide options'));
  if (!xml)
    return callback(new Error('must provide XML to encrypt'));
  if (!options.key)
    return callback(new Error('key option is mandatory and you should provide a valid RSA private key'));
  try {
    var doc = typeof xml === 'string' ? new xmldom.DOMParser().parseFromString(xml) : xml;

    var symmetricKey = decryptKeyInfo(doc, options);
    var encryptionMethod = xpath.select("//*[local-name(.)='EncryptedData']/*[local-name(.)='EncryptionMethod']", doc)[0];
    var encryptionAlgorithm = encryptionMethod.getAttribute('Algorithm');

    if (options.disallowDecryptionWithInsecureAlgorithm
      && insecureAlgorithms.indexOf(encryptionAlgorithm) >= 0) {
      return callback(new Error('encryption algorithm ' + encryptionAlgorithm + ' is not secure, fail to decrypt'));
    }
    var encryptedContent = xpath.select("//*[local-name(.)='EncryptedData']/*[local-name(.)='CipherData']/*[local-name(.)='CipherValue']", doc)[0];

    var encrypted = Buffer.from(encryptedContent.textContent, 'base64');
    switch (encryptionAlgorithm) {
      case 'http://www.w3.org/2001/04/xmlenc#aes128-cbc':
        return callback(null, decryptWithAlgorithm('aes-128-cbc', symmetricKey, 16, encrypted));
      case 'http://www.w3.org/2001/04/xmlenc#aes256-cbc':
        return callback(null, decryptWithAlgorithm('aes-256-cbc', symmetricKey, 16, encrypted));
      case 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc':
        utils.warnInsecureAlgorithm(encryptionAlgorithm, options.warnInsecureAlgorithm);
        return callback(null, decryptWithAlgorithm('des-ede3-cbc', symmetricKey, 8, encrypted));
      case 'http://www.w3.org/2009/xmlenc11#aes128-gcm':
        return callback(null, decryptWithAlgorithm('aes-128-gcm', symmetricKey, 12, encrypted));
      case 'http://www.w3.org/2009/xmlenc11#aes256-gcm':
        return callback(null, decryptWithAlgorithm('aes-256-gcm', symmetricKey, 12, encrypted));
      default:
        return callback(new Error('encryption algorithm ' + encryptionAlgorithm + ' not supported'));
    }
  } catch (e) {
    return callback(e);
  }
}

function decryptKeyInfo(doc, options) {
  if (typeof doc === 'string') doc = new xmldom.DOMParser().parseFromString(doc);

  var keyRetrievalMethodUri;
  var keyInfo = xpath.select("//*[local-name(.)='KeyInfo' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']", doc)[0];
  var keyEncryptionMethod = xpath.select("//*[local-name(.)='KeyInfo']/*[local-name(.)='EncryptedKey']/*[local-name(.)='EncryptionMethod']", doc)[0];

  if (!keyEncryptionMethod) { // try with EncryptedData->KeyInfo->RetrievalMethod
    var keyRetrievalMethod = xpath.select("//*[local-name(.)='EncryptedData']/*[local-name(.)='KeyInfo']/*[local-name(.)='RetrievalMethod']", doc)[0];
    keyRetrievalMethodUri = keyRetrievalMethod ? keyRetrievalMethod.getAttribute('URI') : null;
    keyEncryptionMethod = keyRetrievalMethodUri ? xpath.select("//*[local-name(.)='EncryptedKey' and @Id='" + keyRetrievalMethodUri.substring(1) + "']/*[local-name(.)='EncryptionMethod']", doc)[0] : null;
  }

  if (!keyEncryptionMethod) {
    throw new Error('cant find encryption algorithm');
  }

  var keyEncryptionAlgorithm = keyEncryptionMethod.getAttribute('Algorithm');
  if (options.disallowDecryptionWithInsecureAlgorithm
    && insecureAlgorithms.indexOf(keyEncryptionAlgorithm) >= 0) {
    throw new Error('encryption algorithm ' + keyEncryptionAlgorithm + ' is not secure, fail to decrypt');
  }
  var encryptedKey = keyRetrievalMethodUri ?
    xpath.select("//*[local-name(.)='EncryptedKey' and @Id='" + keyRetrievalMethodUri.substring(1) + "']/*[local-name(.)='CipherData']/*[local-name(.)='CipherValue']", keyInfo)[0] :
    xpath.select("//*[local-name(.)='CipherValue']", keyInfo)[0];

  switch (keyEncryptionAlgorithm) {
    case 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p':
      return decryptKeyInfoWithScheme(encryptedKey, options, 'RSA-OAEP');
    case 'http://www.w3.org/2001/04/xmlenc#rsa-1_5':
      utils.warnInsecureAlgorithm(keyEncryptionAlgorithm, options.warnInsecureAlgorithm);
      return decryptKeyInfoWithScheme(encryptedKey, options, 'RSAES-PKCS1-V1_5');
    default:
      throw new Error('key encryption algorithm ' + keyEncryptionAlgorithm + ' not supported');
  }
}

function decryptKeyInfoWithScheme(encryptedKey, options, scheme) {
  var padding = scheme === 'RSA-OAEP' ? crypto.constants.RSA_PKCS1_OAEP_PADDING : crypto.constants.RSA_PKCS1_PADDING;
  var key = Buffer.from(encryptedKey.textContent, 'base64');
  var decrypted = crypto.privateDecrypt({ key: options.key, padding: padding}, key);
  return Buffer.from(decrypted, 'binary');
}

function encryptWithAlgorithm(algorithm, symmetricKey, ivLength, content, encoding, callback) {
  // create a random iv for algorithm
  crypto.randomBytes(ivLength, function(err, iv) {
    if (err) return callback(err);

    var cipher = crypto.createCipheriv(algorithm, symmetricKey, iv);
    // encrypted content
    var encrypted = cipher.update(content, encoding, 'binary') + cipher.final('binary');
    var authTag = algorithm.slice(-3) === "gcm" ? cipher.getAuthTag() : Buffer.from("");
    //Format mentioned: https://www.w3.org/TR/xmlenc-core1/#sec-AES-GCM
    var r = Buffer.concat([iv, Buffer.from(encrypted, 'binary'), authTag]);
    return callback(null, r);
  });
}

function decryptWithAlgorithm(algorithm, symmetricKey, ivLength, content) {
  var decipher = crypto.createDecipheriv(algorithm, symmetricKey, content.slice(0,ivLength));
  decipher.setAutoPadding(false);

  if (algorithm.slice(-3) === "gcm") {
    decipher.setAuthTag(content.slice(-16));
    content = content.slice(0,-16);
  }
  var decrypted = decipher.update(content.slice(ivLength), null, 'binary') + decipher.final('binary');

if (algorithm.slice(-3) !== "gcm") {
  // Remove padding bytes equal to the value of the last byte of the returned data.
  // Padding for GCM not required per: https://www.w3.org/TR/xmlenc-core1/#sec-AES-GCM
  var padding = decrypted.charCodeAt(decrypted.length - 1);
  if (1 <= padding && padding <= ivLength) {
    decrypted = decrypted.substr(0, decrypted.length - padding);
  } else {
    callback(new Error('padding length invalid'));
    return;
  }
}

  return Buffer.from(decrypted, 'binary').toString('utf8');
}

exports = module.exports = {
  decrypt: decrypt,
  encrypt: encrypt,
  encryptKeyInfo: encryptKeyInfo,
  decryptKeyInfo: decryptKeyInfo
};
