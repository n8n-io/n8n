/**
 * Javascript implementation of PKCS#12.
 *
 * @author Dave Longley
 * @author Stefan Siegl <stesie@brokenpipe.de>
 *
 * Copyright (c) 2010-2014 Digital Bazaar, Inc.
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 *
 * The ASN.1 representation of PKCS#12 is as follows
 * (see ftp://ftp.rsasecurity.com/pub/pkcs/pkcs-12/pkcs-12-tc1.pdf for details)
 *
 * PFX ::= SEQUENCE {
 *   version  INTEGER {v3(3)}(v3,...),
 *   authSafe ContentInfo,
 *   macData  MacData OPTIONAL
 * }
 *
 * MacData ::= SEQUENCE {
 *   mac DigestInfo,
 *   macSalt OCTET STRING,
 *   iterations INTEGER DEFAULT 1
 * }
 * Note: The iterations default is for historical reasons and its use is
 * deprecated. A higher value, like 1024, is recommended.
 *
 * DigestInfo is defined in PKCS#7 as follows:
 *
 * DigestInfo ::= SEQUENCE {
 *   digestAlgorithm DigestAlgorithmIdentifier,
 *   digest Digest
 * }
 *
 * DigestAlgorithmIdentifier ::= AlgorithmIdentifier
 *
 * The AlgorithmIdentifier contains an Object Identifier (OID) and parameters
 * for the algorithm, if any. In the case of SHA1 there is none.
 *
 * AlgorithmIdentifer ::= SEQUENCE {
 *    algorithm OBJECT IDENTIFIER,
 *    parameters ANY DEFINED BY algorithm OPTIONAL
 * }
 *
 * Digest ::= OCTET STRING
 *
 *
 * ContentInfo ::= SEQUENCE {
 *   contentType ContentType,
 *   content     [0] EXPLICIT ANY DEFINED BY contentType OPTIONAL
 * }
 *
 * ContentType ::= OBJECT IDENTIFIER
 *
 * AuthenticatedSafe ::= SEQUENCE OF ContentInfo
 * -- Data if unencrypted
 * -- EncryptedData if password-encrypted
 * -- EnvelopedData if public key-encrypted
 *
 *
 * SafeContents ::= SEQUENCE OF SafeBag
 *
 * SafeBag ::= SEQUENCE {
 *   bagId     BAG-TYPE.&id ({PKCS12BagSet})
 *   bagValue  [0] EXPLICIT BAG-TYPE.&Type({PKCS12BagSet}{@bagId}),
 *   bagAttributes SET OF PKCS12Attribute OPTIONAL
 * }
 *
 * PKCS12Attribute ::= SEQUENCE {
 *   attrId ATTRIBUTE.&id ({PKCS12AttrSet}),
 *   attrValues SET OF ATTRIBUTE.&Type ({PKCS12AttrSet}{@attrId})
 * } -- This type is compatible with the X.500 type 'Attribute'
 *
 * PKCS12AttrSet ATTRIBUTE ::= {
 *   friendlyName | -- from PKCS #9
 *   localKeyId, -- from PKCS #9
 *   ... -- Other attributes are allowed
 * }
 *
 * CertBag ::= SEQUENCE {
 *   certId    BAG-TYPE.&id   ({CertTypes}),
 *   certValue [0] EXPLICIT BAG-TYPE.&Type ({CertTypes}{@certId})
 * }
 *
 * x509Certificate BAG-TYPE ::= {OCTET STRING IDENTIFIED BY {certTypes 1}}
 *   -- DER-encoded X.509 certificate stored in OCTET STRING
 *
 * sdsiCertificate BAG-TYPE ::= {IA5String IDENTIFIED BY {certTypes 2}}
 * -- Base64-encoded SDSI certificate stored in IA5String
 *
 * CertTypes BAG-TYPE ::= {
 *   x509Certificate |
 *   sdsiCertificate,
 *   ... -- For future extensions
 * }
 */
var forge = require('./forge');
require('./asn1');
require('./hmac');
require('./oids');
require('./pkcs7asn1');
require('./pbe');
require('./random');
require('./rsa');
require('./sha1');
require('./util');
require('./x509');

// shortcut for asn.1 & PKI API
var asn1 = forge.asn1;
var pki = forge.pki;

// shortcut for PKCS#12 API
var p12 = module.exports = forge.pkcs12 = forge.pkcs12 || {};

var contentInfoValidator = {
  name: 'ContentInfo',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,  // a ContentInfo
  constructed: true,
  value: [{
    name: 'ContentInfo.contentType',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.OID,
    constructed: false,
    capture: 'contentType'
  }, {
    name: 'ContentInfo.content',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    constructed: true,
    captureAsn1: 'content'
  }]
};

var pfxValidator = {
  name: 'PFX',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'PFX.version',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.INTEGER,
    constructed: false,
    capture: 'version'
  },
  contentInfoValidator, {
    name: 'PFX.macData',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    optional: true,
    captureAsn1: 'mac',
    value: [{
      name: 'PFX.macData.mac',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,  // DigestInfo
      constructed: true,
      value: [{
        name: 'PFX.macData.mac.digestAlgorithm',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,  // DigestAlgorithmIdentifier
        constructed: true,
        value: [{
          name: 'PFX.macData.mac.digestAlgorithm.algorithm',
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: false,
          capture: 'macAlgorithm'
        }, {
          name: 'PFX.macData.mac.digestAlgorithm.parameters',
          tagClass: asn1.Class.UNIVERSAL,
          captureAsn1: 'macAlgorithmParameters'
        }]
      }, {
        name: 'PFX.macData.mac.digest',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: 'macDigest'
      }]
    }, {
      name: 'PFX.macData.macSalt',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.OCTETSTRING,
      constructed: false,
      capture: 'macSalt'
    }, {
      name: 'PFX.macData.iterations',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.INTEGER,
      constructed: false,
      optional: true,
      capture: 'macIterations'
    }]
  }]
};

var safeBagValidator = {
  name: 'SafeBag',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'SafeBag.bagId',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.OID,
    constructed: false,
    capture: 'bagId'
  }, {
    name: 'SafeBag.bagValue',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    constructed: true,
    captureAsn1: 'bagValue'
  }, {
    name: 'SafeBag.bagAttributes',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SET,
    constructed: true,
    optional: true,
    capture: 'bagAttributes'
  }]
};

var attributeValidator = {
  name: 'Attribute',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'Attribute.attrId',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.OID,
    constructed: false,
    capture: 'oid'
  }, {
    name: 'Attribute.attrValues',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SET,
    constructed: true,
    capture: 'values'
  }]
};

var certBagValidator = {
  name: 'CertBag',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'CertBag.certId',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.OID,
    constructed: false,
    capture: 'certId'
  }, {
    name: 'CertBag.certValue',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    constructed: true,
    /* So far we only support X.509 certificates (which are wrapped in
       an OCTET STRING, hence hard code that here). */
    value: [{
      name: 'CertBag.certValue[0]',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Class.OCTETSTRING,
      constructed: false,
      capture: 'cert'
    }]
  }]
};

/**
 * Search SafeContents structure for bags with matching attributes.
 *
 * The search can optionally be narrowed by a certain bag type.
 *
 * @param safeContents the SafeContents structure to search in.
 * @param attrName the name of the attribute to compare against.
 * @param attrValue the attribute value to search for.
 * @param [bagType] bag type to narrow search by.
 *
 * @return an array of matching bags.
 */
function _getBagsByAttribute(safeContents, attrName, attrValue, bagType) {
  var result = [];

  for(var i = 0; i < safeContents.length; i++) {
    for(var j = 0; j < safeContents[i].safeBags.length; j++) {
      var bag = safeContents[i].safeBags[j];
      if(bagType !== undefined && bag.type !== bagType) {
        continue;
      }
      // only filter by bag type, no attribute specified
      if(attrName === null) {
        result.push(bag);
        continue;
      }
      if(bag.attributes[attrName] !== undefined &&
        bag.attributes[attrName].indexOf(attrValue) >= 0) {
        result.push(bag);
      }
    }
  }

  return result;
}

/**
 * Converts a PKCS#12 PFX in ASN.1 notation into a PFX object.
 *
 * @param obj The PKCS#12 PFX in ASN.1 notation.
 * @param strict true to use strict DER decoding, false not to (default: true).
 * @param {String} password Password to decrypt with (optional).
 *
 * @return PKCS#12 PFX object.
 */
p12.pkcs12FromAsn1 = function(obj, strict, password) {
  // handle args
  if(typeof strict === 'string') {
    password = strict;
    strict = true;
  } else if(strict === undefined) {
    strict = true;
  }

  // validate PFX and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, pfxValidator, capture, errors)) {
    var error = new Error('Cannot read PKCS#12 PFX. ' +
      'ASN.1 object is not an PKCS#12 PFX.');
    error.errors = error;
    throw error;
  }

  var pfx = {
    version: capture.version.charCodeAt(0),
    safeContents: [],

    /**
     * Gets bags with matching attributes.
     *
     * @param filter the attributes to filter by:
     *          [localKeyId] the localKeyId to search for.
     *          [localKeyIdHex] the localKeyId in hex to search for.
     *          [friendlyName] the friendly name to search for.
     *          [bagType] bag type to narrow each attribute search by.
     *
     * @return a map of attribute type to an array of matching bags or, if no
     *           attribute was given but a bag type, the map key will be the
     *           bag type.
     */
    getBags: function(filter) {
      var rval = {};

      var localKeyId;
      if('localKeyId' in filter) {
        localKeyId = filter.localKeyId;
      } else if('localKeyIdHex' in filter) {
        localKeyId = forge.util.hexToBytes(filter.localKeyIdHex);
      }

      // filter on bagType only
      if(localKeyId === undefined && !('friendlyName' in filter) &&
        'bagType' in filter) {
        rval[filter.bagType] = _getBagsByAttribute(
          pfx.safeContents, null, null, filter.bagType);
      }

      if(localKeyId !== undefined) {
        rval.localKeyId = _getBagsByAttribute(
          pfx.safeContents, 'localKeyId',
          localKeyId, filter.bagType);
      }
      if('friendlyName' in filter) {
        rval.friendlyName = _getBagsByAttribute(
          pfx.safeContents, 'friendlyName',
          filter.friendlyName, filter.bagType);
      }

      return rval;
    },

    /**
     * DEPRECATED: use getBags() instead.
     *
     * Get bags with matching friendlyName attribute.
     *
     * @param friendlyName the friendly name to search for.
     * @param [bagType] bag type to narrow search by.
     *
     * @return an array of bags with matching friendlyName attribute.
     */
    getBagsByFriendlyName: function(friendlyName, bagType) {
      return _getBagsByAttribute(
        pfx.safeContents, 'friendlyName', friendlyName, bagType);
    },

    /**
     * DEPRECATED: use getBags() instead.
     *
     * Get bags with matching localKeyId attribute.
     *
     * @param localKeyId the localKeyId to search for.
     * @param [bagType] bag type to narrow search by.
     *
     * @return an array of bags with matching localKeyId attribute.
     */
    getBagsByLocalKeyId: function(localKeyId, bagType) {
      return _getBagsByAttribute(
        pfx.safeContents, 'localKeyId', localKeyId, bagType);
    }
  };

  if(capture.version.charCodeAt(0) !== 3) {
    var error = new Error('PKCS#12 PFX of version other than 3 not supported.');
    error.version = capture.version.charCodeAt(0);
    throw error;
  }

  if(asn1.derToOid(capture.contentType) !== pki.oids.data) {
    var error = new Error('Only PKCS#12 PFX in password integrity mode supported.');
    error.oid = asn1.derToOid(capture.contentType);
    throw error;
  }

  var data = capture.content.value[0];
  if(data.tagClass !== asn1.Class.UNIVERSAL ||
     data.type !== asn1.Type.OCTETSTRING) {
    throw new Error('PKCS#12 authSafe content data is not an OCTET STRING.');
  }
  data = _decodePkcs7Data(data);

  // check for MAC
  if(capture.mac) {
    var md = null;
    var macKeyBytes = 0;
    var macAlgorithm = asn1.derToOid(capture.macAlgorithm);
    switch(macAlgorithm) {
    case pki.oids.sha1:
      md = forge.md.sha1.create();
      macKeyBytes = 20;
      break;
    case pki.oids.sha256:
      md = forge.md.sha256.create();
      macKeyBytes = 32;
      break;
    case pki.oids.sha384:
      md = forge.md.sha384.create();
      macKeyBytes = 48;
      break;
    case pki.oids.sha512:
      md = forge.md.sha512.create();
      macKeyBytes = 64;
      break;
    case pki.oids.md5:
      md = forge.md.md5.create();
      macKeyBytes = 16;
      break;
    }
    if(md === null) {
      throw new Error('PKCS#12 uses unsupported MAC algorithm: ' + macAlgorithm);
    }

    // verify MAC (iterations default to 1)
    var macSalt = new forge.util.ByteBuffer(capture.macSalt);
    var macIterations = (('macIterations' in capture) ?
      parseInt(forge.util.bytesToHex(capture.macIterations), 16) : 1);
    var macKey = p12.generateKey(
      password, macSalt, 3, macIterations, macKeyBytes, md);
    var mac = forge.hmac.create();
    mac.start(md, macKey);
    mac.update(data.value);
    var macValue = mac.getMac();
    if(macValue.getBytes() !== capture.macDigest) {
      throw new Error('PKCS#12 MAC could not be verified. Invalid password?');
    }
  } else if(Array.isArray(obj.value) && obj.value.length > 2) {
    /* This is pfx data that should have mac and verify macDigest */
    throw new Error('Invalid PKCS#12. macData field present but MAC was not validated.');
  }

  _decodeAuthenticatedSafe(pfx, data.value, strict, password);
  return pfx;
};

/**
 * Decodes PKCS#7 Data. PKCS#7 (RFC 2315) defines "Data" as an OCTET STRING,
 * but it is sometimes an OCTET STRING that is composed/constructed of chunks,
 * each its own OCTET STRING. This is BER-encoding vs. DER-encoding. This
 * function transforms this corner-case into the usual simple,
 * non-composed/constructed OCTET STRING.
 *
 * This function may be moved to ASN.1 at some point to better deal with
 * more BER-encoding issues, should they arise.
 *
 * @param data the ASN.1 Data object to transform.
 */
function _decodePkcs7Data(data) {
  // handle special case of "chunked" data content: an octet string composed
  // of other octet strings
  if(data.composed || data.constructed) {
    var value = forge.util.createBuffer();
    for(var i = 0; i < data.value.length; ++i) {
      value.putBytes(data.value[i].value);
    }
    data.composed = data.constructed = false;
    data.value = value.getBytes();
  }
  return data;
}

/**
 * Decode PKCS#12 AuthenticatedSafe (BER encoded) into PFX object.
 *
 * The AuthenticatedSafe is a BER-encoded SEQUENCE OF ContentInfo.
 *
 * @param pfx The PKCS#12 PFX object to fill.
 * @param {String} authSafe BER-encoded AuthenticatedSafe.
 * @param strict true to use strict DER decoding, false not to.
 * @param {String} password Password to decrypt with (optional).
 */
function _decodeAuthenticatedSafe(pfx, authSafe, strict, password) {
  authSafe = asn1.fromDer(authSafe, strict);  /* actually it's BER encoded */

  if(authSafe.tagClass !== asn1.Class.UNIVERSAL ||
     authSafe.type !== asn1.Type.SEQUENCE ||
     authSafe.constructed !== true) {
    throw new Error('PKCS#12 AuthenticatedSafe expected to be a ' +
      'SEQUENCE OF ContentInfo');
  }

  for(var i = 0; i < authSafe.value.length; i++) {
    var contentInfo = authSafe.value[i];

    // validate contentInfo and capture data
    var capture = {};
    var errors = [];
    if(!asn1.validate(contentInfo, contentInfoValidator, capture, errors)) {
      var error = new Error('Cannot read ContentInfo.');
      error.errors = errors;
      throw error;
    }

    var obj = {
      encrypted: false
    };
    var safeContents = null;
    var data = capture.content.value[0];
    switch(asn1.derToOid(capture.contentType)) {
    case pki.oids.data:
      if(data.tagClass !== asn1.Class.UNIVERSAL ||
         data.type !== asn1.Type.OCTETSTRING) {
        throw new Error('PKCS#12 SafeContents Data is not an OCTET STRING.');
      }
      safeContents = _decodePkcs7Data(data).value;
      break;
    case pki.oids.encryptedData:
      safeContents = _decryptSafeContents(data, password);
      obj.encrypted = true;
      break;
    default:
      var error = new Error('Unsupported PKCS#12 contentType.');
      error.contentType = asn1.derToOid(capture.contentType);
      throw error;
    }

    obj.safeBags = _decodeSafeContents(safeContents, strict, password);
    pfx.safeContents.push(obj);
  }
}

/**
 * Decrypt PKCS#7 EncryptedData structure.
 *
 * @param data ASN.1 encoded EncryptedContentInfo object.
 * @param password The user-provided password.
 *
 * @return The decrypted SafeContents (ASN.1 object).
 */
function _decryptSafeContents(data, password) {
  var capture = {};
  var errors = [];
  if(!asn1.validate(
    data, forge.pkcs7.asn1.encryptedDataValidator, capture, errors)) {
    var error = new Error('Cannot read EncryptedContentInfo.');
    error.errors = errors;
    throw error;
  }

  var oid = asn1.derToOid(capture.contentType);
  if(oid !== pki.oids.data) {
    var error = new Error(
      'PKCS#12 EncryptedContentInfo ContentType is not Data.');
    error.oid = oid;
    throw error;
  }

  // get cipher
  oid = asn1.derToOid(capture.encAlgorithm);
  var cipher = pki.pbe.getCipher(oid, capture.encParameter, password);

  // get encrypted data
  var encryptedContentAsn1 = _decodePkcs7Data(capture.encryptedContentAsn1);
  var encrypted = forge.util.createBuffer(encryptedContentAsn1.value);

  cipher.update(encrypted);
  if(!cipher.finish()) {
    throw new Error('Failed to decrypt PKCS#12 SafeContents.');
  }

  return cipher.output.getBytes();
}

/**
 * Decode PKCS#12 SafeContents (BER-encoded) into array of Bag objects.
 *
 * The safeContents is a BER-encoded SEQUENCE OF SafeBag.
 *
 * @param {String} safeContents BER-encoded safeContents.
 * @param strict true to use strict DER decoding, false not to.
 * @param {String} password Password to decrypt with (optional).
 *
 * @return {Array} Array of Bag objects.
 */
function _decodeSafeContents(safeContents, strict, password) {
  // if strict and no safe contents, return empty safes
  if(!strict && safeContents.length === 0) {
    return [];
  }

  // actually it's BER-encoded
  safeContents = asn1.fromDer(safeContents, strict);

  if(safeContents.tagClass !== asn1.Class.UNIVERSAL ||
    safeContents.type !== asn1.Type.SEQUENCE ||
    safeContents.constructed !== true) {
    throw new Error(
      'PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.');
  }

  var res = [];
  for(var i = 0; i < safeContents.value.length; i++) {
    var safeBag = safeContents.value[i];

    // validate SafeBag and capture data
    var capture = {};
    var errors = [];
    if(!asn1.validate(safeBag, safeBagValidator, capture, errors)) {
      var error = new Error('Cannot read SafeBag.');
      error.errors = errors;
      throw error;
    }

    /* Create bag object and push to result array. */
    var bag = {
      type: asn1.derToOid(capture.bagId),
      attributes: _decodeBagAttributes(capture.bagAttributes)
    };
    res.push(bag);

    var validator, decoder;
    var bagAsn1 = capture.bagValue.value[0];
    switch(bag.type) {
      case pki.oids.pkcs8ShroudedKeyBag:
        /* bagAsn1 has a EncryptedPrivateKeyInfo, which we need to decrypt.
           Afterwards we can handle it like a keyBag,
           which is a PrivateKeyInfo. */
        bagAsn1 = pki.decryptPrivateKeyInfo(bagAsn1, password);
        if(bagAsn1 === null) {
          throw new Error(
            'Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?');
        }

        /* fall through */
      case pki.oids.keyBag:
        /* A PKCS#12 keyBag is a simple PrivateKeyInfo as understood by our
           PKI module, hence we don't have to do validation/capturing here,
           just pass what we already got. */
        try {
          bag.key = pki.privateKeyFromAsn1(bagAsn1);
        } catch(e) {
          // ignore unknown key type, pass asn1 value
          bag.key = null;
          bag.asn1 = bagAsn1;
        }
        continue;  /* Nothing more to do. */

      case pki.oids.certBag:
        /* A PKCS#12 certBag can wrap both X.509 and sdsi certificates.
           Therefore put the SafeBag content through another validator to
           capture the fields.  Afterwards check & store the results. */
        validator = certBagValidator;
        decoder = function() {
          if(asn1.derToOid(capture.certId) !== pki.oids.x509Certificate) {
            var error = new Error(
              'Unsupported certificate type, only X.509 supported.');
            error.oid = asn1.derToOid(capture.certId);
            throw error;
          }

          // true=produce cert hash
          var certAsn1 = asn1.fromDer(capture.cert, strict);
          try {
            bag.cert = pki.certificateFromAsn1(certAsn1, true);
          } catch(e) {
            // ignore unknown cert type, pass asn1 value
            bag.cert = null;
            bag.asn1 = certAsn1;
          }
        };
        break;

      default:
        var error = new Error('Unsupported PKCS#12 SafeBag type.');
        error.oid = bag.type;
        throw error;
    }

    /* Validate SafeBag value (i.e. CertBag, etc.) and capture data if needed. */
    if(validator !== undefined &&
       !asn1.validate(bagAsn1, validator, capture, errors)) {
      var error = new Error('Cannot read PKCS#12 ' + validator.name);
      error.errors = errors;
      throw error;
    }

    /* Call decoder function from above to store the results. */
    decoder();
  }

  return res;
}

/**
 * Decode PKCS#12 SET OF PKCS12Attribute into JavaScript object.
 *
 * @param attributes SET OF PKCS12Attribute (ASN.1 object).
 *
 * @return the decoded attributes.
 */
function _decodeBagAttributes(attributes) {
  var decodedAttrs = {};

  if(attributes !== undefined) {
    for(var i = 0; i < attributes.length; ++i) {
      var capture = {};
      var errors = [];
      if(!asn1.validate(attributes[i], attributeValidator, capture, errors)) {
        var error = new Error('Cannot read PKCS#12 BagAttribute.');
        error.errors = errors;
        throw error;
      }

      var oid = asn1.derToOid(capture.oid);
      if(pki.oids[oid] === undefined) {
        // unsupported attribute type, ignore.
        continue;
      }

      decodedAttrs[pki.oids[oid]] = [];
      for(var j = 0; j < capture.values.length; ++j) {
        decodedAttrs[pki.oids[oid]].push(capture.values[j].value);
      }
    }
  }

  return decodedAttrs;
}

/**
 * Wraps a private key and certificate in a PKCS#12 PFX wrapper. If a
 * password is provided then the private key will be encrypted.
 *
 * An entire certificate chain may also be included. To do this, pass
 * an array for the "cert" parameter where the first certificate is
 * the one that is paired with the private key and each subsequent one
 * verifies the previous one. The certificates may be in PEM format or
 * have been already parsed by Forge.
 *
 * @todo implement password-based-encryption for the whole package
 *
 * @param key the private key.
 * @param cert the certificate (may be an array of certificates in order
 *          to specify a certificate chain).
 * @param password the password to use, null for none.
 * @param options:
 *          algorithm the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des'), defaults to 'aes128'.
 *          count the iteration count to use.
 *          saltSize the salt size to use.
 *          useMac true to include a MAC, false not to, defaults to true.
 *          localKeyId the local key ID to use, in hex.
 *          friendlyName the friendly name to use.
 *          generateLocalKeyId true to generate a random local key ID,
 *            false not to, defaults to true.
 *
 * @return the PKCS#12 PFX ASN.1 object.
 */
p12.toPkcs12Asn1 = function(key, cert, password, options) {
  // set default options
  options = options || {};
  options.saltSize = options.saltSize || 8;
  options.count = options.count || 2048;
  options.algorithm = options.algorithm || options.encAlgorithm || 'aes128';
  if(!('useMac' in options)) {
    options.useMac = true;
  }
  if(!('localKeyId' in options)) {
    options.localKeyId = null;
  }
  if(!('generateLocalKeyId' in options)) {
    options.generateLocalKeyId = true;
  }

  var localKeyId = options.localKeyId;
  var bagAttrs;
  if(localKeyId !== null) {
    localKeyId = forge.util.hexToBytes(localKeyId);
  } else if(options.generateLocalKeyId) {
    // use SHA-1 of paired cert, if available
    if(cert) {
      var pairedCert = forge.util.isArray(cert) ? cert[0] : cert;
      if(typeof pairedCert === 'string') {
        pairedCert = pki.certificateFromPem(pairedCert);
      }
      var sha1 = forge.md.sha1.create();
      sha1.update(asn1.toDer(pki.certificateToAsn1(pairedCert)).getBytes());
      localKeyId = sha1.digest().getBytes();
    } else {
      // FIXME: consider using SHA-1 of public key (which can be generated
      // from private key components), see: cert.generateSubjectKeyIdentifier
      // generate random bytes
      localKeyId = forge.random.getBytes(20);
    }
  }

  var attrs = [];
  if(localKeyId !== null) {
    attrs.push(
      // localKeyID
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // attrId
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(pki.oids.localKeyId).getBytes()),
        // attrValues
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
            localKeyId)
        ])
      ]));
  }
  if('friendlyName' in options) {
    attrs.push(
      // friendlyName
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // attrId
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(pki.oids.friendlyName).getBytes()),
        // attrValues
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, false,
            options.friendlyName)
        ])
      ]));
  }

  if(attrs.length > 0) {
    bagAttrs = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, attrs);
  }

  // collect contents for AuthenticatedSafe
  var contents = [];

  // create safe bag(s) for certificate chain
  var chain = [];
  if(cert !== null) {
    if(forge.util.isArray(cert)) {
      chain = cert;
    } else {
      chain = [cert];
    }
  }

  var certSafeBags = [];
  for(var i = 0; i < chain.length; ++i) {
    // convert cert from PEM as necessary
    cert = chain[i];
    if(typeof cert === 'string') {
      cert = pki.certificateFromPem(cert);
    }

    // SafeBag
    var certBagAttrs = (i === 0) ? bagAttrs : undefined;
    var certAsn1 = pki.certificateToAsn1(cert);
    var certSafeBag =
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // bagId
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(pki.oids.certBag).getBytes()),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // CertBag
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // certId
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
              asn1.oidToDer(pki.oids.x509Certificate).getBytes()),
            // certValue (x509Certificate)
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
              asn1.create(
                asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                asn1.toDer(certAsn1).getBytes())
            ])])]),
        // bagAttributes (OPTIONAL)
        certBagAttrs
      ]);
    certSafeBags.push(certSafeBag);
  }

  if(certSafeBags.length > 0) {
    // SafeContents
    var certSafeContents = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, certSafeBags);

    // ContentInfo
    var certCI =
      // PKCS#7 ContentInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // contentType
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          // OID for the content type is 'data'
          asn1.oidToDer(pki.oids.data).getBytes()),
        // content
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
            asn1.toDer(certSafeContents).getBytes())
        ])
      ]);
    contents.push(certCI);
  }

  // create safe contents for private key
  var keyBag = null;
  if(key !== null) {
    // SafeBag
    var pkAsn1 = pki.wrapRsaPrivateKey(pki.privateKeyToAsn1(key));
    if(password === null) {
      // no encryption
      keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // bagId
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(pki.oids.keyBag).getBytes()),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // PrivateKeyInfo
          pkAsn1
        ]),
        // bagAttributes (OPTIONAL)
        bagAttrs
      ]);
    } else {
      // encrypted PrivateKeyInfo
      keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // bagId
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(pki.oids.pkcs8ShroudedKeyBag).getBytes()),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // EncryptedPrivateKeyInfo
          pki.encryptPrivateKeyInfo(pkAsn1, password, options)
        ]),
        // bagAttributes (OPTIONAL)
        bagAttrs
      ]);
    }

    // SafeContents
    var keySafeContents =
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [keyBag]);

    // ContentInfo
    var keyCI =
      // PKCS#7 ContentInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // contentType
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          // OID for the content type is 'data'
          asn1.oidToDer(pki.oids.data).getBytes()),
        // content
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
            asn1.toDer(keySafeContents).getBytes())
        ])
      ]);
    contents.push(keyCI);
  }

  // create AuthenticatedSafe by stringing together the contents
  var safe = asn1.create(
    asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, contents);

  var macData;
  if(options.useMac) {
    // MacData
    var sha1 = forge.md.sha1.create();
    var macSalt = new forge.util.ByteBuffer(
      forge.random.getBytes(options.saltSize));
    var count = options.count;
    // 160-bit key
    var key = p12.generateKey(password, macSalt, 3, count, 20);
    var mac = forge.hmac.create();
    mac.start(sha1, key);
    mac.update(asn1.toDer(safe).getBytes());
    var macValue = mac.getMac();
    macData = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // mac DigestInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // digestAlgorithm
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // algorithm = SHA-1
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
            asn1.oidToDer(pki.oids.sha1).getBytes()),
          // parameters = Null
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
        ]),
        // digest
        asn1.create(
          asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING,
          false, macValue.getBytes())
      ]),
      // macSalt OCTET STRING
      asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, macSalt.getBytes()),
      // iterations INTEGER (XXX: Only support count < 65536)
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        asn1.integerToDer(count).getBytes()
      )
    ]);
  }

  // PFX
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version (3)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      asn1.integerToDer(3).getBytes()),
    // PKCS#7 ContentInfo
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // contentType
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        // OID for the content type is 'data'
        asn1.oidToDer(pki.oids.data).getBytes()),
      // content
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        asn1.create(
          asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
          asn1.toDer(safe).getBytes())
      ])
    ]),
    macData
  ]);
};

/**
 * Derives a PKCS#12 key.
 *
 * @param password the password to derive the key material from, null or
 *          undefined for none.
 * @param salt the salt, as a ByteBuffer, to use.
 * @param id the PKCS#12 ID byte (1 = key material, 2 = IV, 3 = MAC).
 * @param iter the iteration count.
 * @param n the number of bytes to derive from the password.
 * @param md the message digest to use, defaults to SHA-1.
 *
 * @return a ByteBuffer with the bytes derived from the password.
 */
p12.generateKey = forge.pbe.generatePkcs12Key;
