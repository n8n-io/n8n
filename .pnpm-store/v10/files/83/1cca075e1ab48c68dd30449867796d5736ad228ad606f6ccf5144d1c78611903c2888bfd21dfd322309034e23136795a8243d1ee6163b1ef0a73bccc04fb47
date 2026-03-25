/**
 * Javascript implementation of PKCS#7 v1.5.
 *
 * @author Stefan Siegl
 * @author Dave Longley
 *
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 * Copyright (c) 2012-2015 Digital Bazaar, Inc.
 *
 * Currently this implementation only supports ContentType of EnvelopedData,
 * EncryptedData, or SignedData at the root level. The top level elements may
 * contain only a ContentInfo of ContentType Data, i.e. plain data. Further
 * nesting is not (yet) supported.
 *
 * The Forge validators for PKCS #7's ASN.1 structures are available from
 * a separate file pkcs7asn1.js, since those are referenced from other
 * PKCS standards like PKCS #12.
 */
var forge = require('./forge');
require('./aes');
require('./asn1');
require('./des');
require('./oids');
require('./pem');
require('./pkcs7asn1');
require('./random');
require('./util');
require('./x509');

// shortcut for ASN.1 API
var asn1 = forge.asn1;

// shortcut for PKCS#7 API
var p7 = module.exports = forge.pkcs7 = forge.pkcs7 || {};

/**
 * Converts a PKCS#7 message from PEM format.
 *
 * @param pem the PEM-formatted PKCS#7 message.
 *
 * @return the PKCS#7 message.
 */
p7.messageFromPem = function(pem) {
  var msg = forge.pem.decode(pem)[0];

  if(msg.type !== 'PKCS7') {
    var error = new Error('Could not convert PKCS#7 message from PEM; PEM ' +
      'header type is not "PKCS#7".');
    error.headerType = msg.type;
    throw error;
  }
  if(msg.procType && msg.procType.type === 'ENCRYPTED') {
    throw new Error('Could not convert PKCS#7 message from PEM; PEM is encrypted.');
  }

  // convert DER to ASN.1 object
  var obj = asn1.fromDer(msg.body);

  return p7.messageFromAsn1(obj);
};

/**
 * Converts a PKCS#7 message to PEM format.
 *
 * @param msg The PKCS#7 message object
 * @param maxline The maximum characters per line, defaults to 64.
 *
 * @return The PEM-formatted PKCS#7 message.
 */
p7.messageToPem = function(msg, maxline) {
  // convert to ASN.1, then DER, then PEM-encode
  var pemObj = {
    type: 'PKCS7',
    body: asn1.toDer(msg.toAsn1()).getBytes()
  };
  return forge.pem.encode(pemObj, {maxline: maxline});
};

/**
 * Converts a PKCS#7 message from an ASN.1 object.
 *
 * @param obj the ASN.1 representation of a ContentInfo.
 *
 * @return the PKCS#7 message.
 */
p7.messageFromAsn1 = function(obj) {
  // validate root level ContentInfo and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, p7.asn1.contentInfoValidator, capture, errors)) {
    var error = new Error('Cannot read PKCS#7 message. ' +
      'ASN.1 object is not an PKCS#7 ContentInfo.');
    error.errors = errors;
    throw error;
  }

  var contentType = asn1.derToOid(capture.contentType);
  var msg;

  switch(contentType) {
    case forge.pki.oids.envelopedData:
      msg = p7.createEnvelopedData();
      break;

    case forge.pki.oids.encryptedData:
      msg = p7.createEncryptedData();
      break;

    case forge.pki.oids.signedData:
      msg = p7.createSignedData();
      break;

    default:
      throw new Error('Cannot read PKCS#7 message. ContentType with OID ' +
        contentType + ' is not (yet) supported.');
  }

  msg.fromAsn1(capture.content.value[0]);
  return msg;
};

p7.createSignedData = function() {
  var msg = null;
  msg = {
    type: forge.pki.oids.signedData,
    version: 1,
    certificates: [],
    crls: [],
    // TODO: add json-formatted signer stuff here?
    signers: [],
    // populated during sign()
    digestAlgorithmIdentifiers: [],
    contentInfo: null,
    signerInfos: [],

    fromAsn1: function(obj) {
      // validate SignedData content block and capture data.
      _fromAsn1(msg, obj, p7.asn1.signedDataValidator);
      msg.certificates = [];
      msg.crls = [];
      msg.digestAlgorithmIdentifiers = [];
      msg.contentInfo = null;
      msg.signerInfos = [];

      if(msg.rawCapture.certificates) {
        var certs = msg.rawCapture.certificates.value;
        for(var i = 0; i < certs.length; ++i) {
          msg.certificates.push(forge.pki.certificateFromAsn1(certs[i]));
        }
      }

      // TODO: parse crls
    },

    toAsn1: function() {
      // degenerate case with no content
      if(!msg.contentInfo) {
        msg.sign();
      }

      var certs = [];
      for(var i = 0; i < msg.certificates.length; ++i) {
        certs.push(forge.pki.certificateToAsn1(msg.certificates[i]));
      }

      var crls = [];
      // TODO: implement CRLs

      // [0] SignedData
      var signedData = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // Version
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(msg.version).getBytes()),
          // DigestAlgorithmIdentifiers
          asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.SET, true,
            msg.digestAlgorithmIdentifiers),
          // ContentInfo
          msg.contentInfo
        ])
      ]);
      if(certs.length > 0) {
        // [0] IMPLICIT ExtendedCertificatesAndCertificates OPTIONAL
        signedData.value[0].value.push(
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, certs));
      }
      if(crls.length > 0) {
        // [1] IMPLICIT CertificateRevocationLists OPTIONAL
        signedData.value[0].value.push(
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, crls));
      }
      // SignerInfos
      signedData.value[0].value.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true,
          msg.signerInfos));

      // ContentInfo
      return asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // ContentType
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
            asn1.oidToDer(msg.type).getBytes()),
          // [0] SignedData
          signedData
        ]);
    },

    /**
     * Add (another) entity to list of signers.
     *
     * Note: If authenticatedAttributes are provided, then, per RFC 2315,
     * they must include at least two attributes: content type and
     * message digest. The message digest attribute value will be
     * auto-calculated during signing and will be ignored if provided.
     *
     * Here's an example of providing these two attributes:
     *
     * forge.pkcs7.createSignedData();
     * p7.addSigner({
     *   issuer: cert.issuer.attributes,
     *   serialNumber: cert.serialNumber,
     *   key: privateKey,
     *   digestAlgorithm: forge.pki.oids.sha1,
     *   authenticatedAttributes: [{
     *     type: forge.pki.oids.contentType,
     *     value: forge.pki.oids.data
     *   }, {
     *     type: forge.pki.oids.messageDigest
     *   }]
     * });
     *
     * TODO: Support [subjectKeyIdentifier] as signer's ID.
     *
     * @param signer the signer information:
     *          key the signer's private key.
     *          [certificate] a certificate containing the public key
     *            associated with the signer's private key; use this option as
     *            an alternative to specifying signer.issuer and
     *            signer.serialNumber.
     *          [issuer] the issuer attributes (eg: cert.issuer.attributes).
     *          [serialNumber] the signer's certificate's serial number in
     *           hexadecimal (eg: cert.serialNumber).
     *          [digestAlgorithm] the message digest OID, as a string, to use
     *            (eg: forge.pki.oids.sha1).
     *          [authenticatedAttributes] an optional array of attributes
     *            to also sign along with the content.
     */
    addSigner: function(signer) {
      var issuer = signer.issuer;
      var serialNumber = signer.serialNumber;
      if(signer.certificate) {
        var cert = signer.certificate;
        if(typeof cert === 'string') {
          cert = forge.pki.certificateFromPem(cert);
        }
        issuer = cert.issuer.attributes;
        serialNumber = cert.serialNumber;
      }
      var key = signer.key;
      if(!key) {
        throw new Error(
          'Could not add PKCS#7 signer; no private key specified.');
      }
      if(typeof key === 'string') {
        key = forge.pki.privateKeyFromPem(key);
      }

      // ensure OID known for digest algorithm
      var digestAlgorithm = signer.digestAlgorithm || forge.pki.oids.sha1;
      switch(digestAlgorithm) {
      case forge.pki.oids.sha1:
      case forge.pki.oids.sha256:
      case forge.pki.oids.sha384:
      case forge.pki.oids.sha512:
      case forge.pki.oids.md5:
        break;
      default:
        throw new Error(
          'Could not add PKCS#7 signer; unknown message digest algorithm: ' +
          digestAlgorithm);
      }

      // if authenticatedAttributes is present, then the attributes
      // must contain at least PKCS #9 content-type and message-digest
      var authenticatedAttributes = signer.authenticatedAttributes || [];
      if(authenticatedAttributes.length > 0) {
        var contentType = false;
        var messageDigest = false;
        for(var i = 0; i < authenticatedAttributes.length; ++i) {
          var attr = authenticatedAttributes[i];
          if(!contentType && attr.type === forge.pki.oids.contentType) {
            contentType = true;
            if(messageDigest) {
              break;
            }
            continue;
          }
          if(!messageDigest && attr.type === forge.pki.oids.messageDigest) {
            messageDigest = true;
            if(contentType) {
              break;
            }
            continue;
          }
        }

        if(!contentType || !messageDigest) {
          throw new Error('Invalid signer.authenticatedAttributes. If ' +
            'signer.authenticatedAttributes is specified, then it must ' +
            'contain at least two attributes, PKCS #9 content-type and ' +
            'PKCS #9 message-digest.');
        }
      }

      msg.signers.push({
        key: key,
        version: 1,
        issuer: issuer,
        serialNumber: serialNumber,
        digestAlgorithm: digestAlgorithm,
        signatureAlgorithm: forge.pki.oids.rsaEncryption,
        signature: null,
        authenticatedAttributes: authenticatedAttributes,
        unauthenticatedAttributes: []
      });
    },

    /**
     * Signs the content.
     * @param options Options to apply when signing:
     *    [detached] boolean. If signing should be done in detached mode. Defaults to false.
     */
    sign: function(options) {
      options = options || {};
      // auto-generate content info
      if(typeof msg.content !== 'object' || msg.contentInfo === null) {
        // use Data ContentInfo
        msg.contentInfo = asn1.create(
          asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // ContentType
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
              asn1.oidToDer(forge.pki.oids.data).getBytes())
          ]);

        // add actual content, if present
        if('content' in msg) {
          var content;
          if(msg.content instanceof forge.util.ByteBuffer) {
            content = msg.content.bytes();
          } else if(typeof msg.content === 'string') {
            content = forge.util.encodeUtf8(msg.content);
          }

          if (options.detached) {
            msg.detachedContent = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, content);
          } else {
            msg.contentInfo.value.push(
              // [0] EXPLICIT content
              asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
                  content)
              ]));
          }
        }
      }

      // no signers, return early (degenerate case for certificate container)
      if(msg.signers.length === 0) {
        return;
      }

      // generate digest algorithm identifiers
      var mds = addDigestAlgorithmIds();

      // generate signerInfos
      addSignerInfos(mds);
    },

    verify: function() {
      throw new Error('PKCS#7 signature verification not yet implemented.');
    },

    /**
     * Add a certificate.
     *
     * @param cert the certificate to add.
     */
    addCertificate: function(cert) {
      // convert from PEM
      if(typeof cert === 'string') {
        cert = forge.pki.certificateFromPem(cert);
      }
      msg.certificates.push(cert);
    },

    /**
     * Add a certificate revokation list.
     *
     * @param crl the certificate revokation list to add.
     */
    addCertificateRevokationList: function(crl) {
      throw new Error('PKCS#7 CRL support not yet implemented.');
    }
  };
  return msg;

  function addDigestAlgorithmIds() {
    var mds = {};

    for(var i = 0; i < msg.signers.length; ++i) {
      var signer = msg.signers[i];
      var oid = signer.digestAlgorithm;
      if(!(oid in mds)) {
        // content digest
        mds[oid] = forge.md[forge.pki.oids[oid]].create();
      }
      if(signer.authenticatedAttributes.length === 0) {
        // no custom attributes to digest; use content message digest
        signer.md = mds[oid];
      } else {
        // custom attributes to be digested; use own message digest
        // TODO: optimize to just copy message digest state if that
        // feature is ever supported with message digests
        signer.md = forge.md[forge.pki.oids[oid]].create();
      }
    }

    // add unique digest algorithm identifiers
    msg.digestAlgorithmIdentifiers = [];
    for(var oid in mds) {
      msg.digestAlgorithmIdentifiers.push(
        // AlgorithmIdentifier
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // algorithm
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
            asn1.oidToDer(oid).getBytes()),
          // parameters (null)
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
        ]));
    }

    return mds;
  }

  function addSignerInfos(mds) {
    var content;

    if (msg.detachedContent) {
      // Signature has been made in detached mode.
      content = msg.detachedContent;
    } else {
      // Note: ContentInfo is a SEQUENCE with 2 values, second value is
      // the content field and is optional for a ContentInfo but required here
      // since signers are present
      // get ContentInfo content
      content = msg.contentInfo.value[1];
      // skip [0] EXPLICIT content wrapper
      content = content.value[0];
    }

    if(!content) {
      throw new Error(
        'Could not sign PKCS#7 message; there is no content to sign.');
    }

    // get ContentInfo content type
    var contentType = asn1.derToOid(msg.contentInfo.value[0].value);

    // serialize content
    var bytes = asn1.toDer(content);

    // skip identifier and length per RFC 2315 9.3
    // skip identifier (1 byte)
    bytes.getByte();
    // read and discard length bytes
    asn1.getBerValueLength(bytes);
    bytes = bytes.getBytes();

    // digest content DER value bytes
    for(var oid in mds) {
      mds[oid].start().update(bytes);
    }

    // sign content
    var signingTime = new Date();
    for(var i = 0; i < msg.signers.length; ++i) {
      var signer = msg.signers[i];

      if(signer.authenticatedAttributes.length === 0) {
        // if ContentInfo content type is not "Data", then
        // authenticatedAttributes must be present per RFC 2315
        if(contentType !== forge.pki.oids.data) {
          throw new Error(
            'Invalid signer; authenticatedAttributes must be present ' +
            'when the ContentInfo content type is not PKCS#7 Data.');
        }
      } else {
        // process authenticated attributes
        // [0] IMPLICIT
        signer.authenticatedAttributesAsn1 = asn1.create(
          asn1.Class.CONTEXT_SPECIFIC, 0, true, []);

        // per RFC 2315, attributes are to be digested using a SET container
        // not the above [0] IMPLICIT container
        var attrsAsn1 = asn1.create(
          asn1.Class.UNIVERSAL, asn1.Type.SET, true, []);

        for(var ai = 0; ai < signer.authenticatedAttributes.length; ++ai) {
          var attr = signer.authenticatedAttributes[ai];
          if(attr.type === forge.pki.oids.messageDigest) {
            // use content message digest as value
            attr.value = mds[signer.digestAlgorithm].digest();
          } else if(attr.type === forge.pki.oids.signingTime) {
            // auto-populate signing time if not already set
            if(!attr.value) {
              attr.value = signingTime;
            }
          }

          // convert to ASN.1 and push onto Attributes SET (for signing) and
          // onto authenticatedAttributesAsn1 to complete SignedData ASN.1
          // TODO: optimize away duplication
          attrsAsn1.value.push(_attributeToAsn1(attr));
          signer.authenticatedAttributesAsn1.value.push(_attributeToAsn1(attr));
        }

        // DER-serialize and digest SET OF attributes only
        bytes = asn1.toDer(attrsAsn1).getBytes();
        signer.md.start().update(bytes);
      }

      // sign digest
      signer.signature = signer.key.sign(signer.md, 'RSASSA-PKCS1-V1_5');
    }

    // add signer info
    msg.signerInfos = _signersToAsn1(msg.signers);
  }
};

/**
 * Creates an empty PKCS#7 message of type EncryptedData.
 *
 * @return the message.
 */
p7.createEncryptedData = function() {
  var msg = null;
  msg = {
    type: forge.pki.oids.encryptedData,
    version: 0,
    encryptedContent: {
      algorithm: forge.pki.oids['aes256-CBC']
    },

    /**
     * Reads an EncryptedData content block (in ASN.1 format)
     *
     * @param obj The ASN.1 representation of the EncryptedData content block
     */
    fromAsn1: function(obj) {
      // Validate EncryptedData content block and capture data.
      _fromAsn1(msg, obj, p7.asn1.encryptedDataValidator);
    },

    /**
     * Decrypt encrypted content
     *
     * @param key The (symmetric) key as a byte buffer
     */
    decrypt: function(key) {
      if(key !== undefined) {
        msg.encryptedContent.key = key;
      }
      _decryptContent(msg);
    }
  };
  return msg;
};

/**
 * Creates an empty PKCS#7 message of type EnvelopedData.
 *
 * @return the message.
 */
p7.createEnvelopedData = function() {
  var msg = null;
  msg = {
    type: forge.pki.oids.envelopedData,
    version: 0,
    recipients: [],
    encryptedContent: {
      algorithm: forge.pki.oids['aes256-CBC']
    },

    /**
     * Reads an EnvelopedData content block (in ASN.1 format)
     *
     * @param obj the ASN.1 representation of the EnvelopedData content block.
     */
    fromAsn1: function(obj) {
      // validate EnvelopedData content block and capture data
      var capture = _fromAsn1(msg, obj, p7.asn1.envelopedDataValidator);
      msg.recipients = _recipientsFromAsn1(capture.recipientInfos.value);
    },

    toAsn1: function() {
      // ContentInfo
      return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // ContentType
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(msg.type).getBytes()),
        // [0] EnvelopedData
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // Version
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
              asn1.integerToDer(msg.version).getBytes()),
            // RecipientInfos
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true,
              _recipientsToAsn1(msg.recipients)),
            // EncryptedContentInfo
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true,
              _encryptedContentToAsn1(msg.encryptedContent))
          ])
        ])
      ]);
    },

    /**
     * Find recipient by X.509 certificate's issuer.
     *
     * @param cert the certificate with the issuer to look for.
     *
     * @return the recipient object.
     */
    findRecipient: function(cert) {
      var sAttr = cert.issuer.attributes;

      for(var i = 0; i < msg.recipients.length; ++i) {
        var r = msg.recipients[i];
        var rAttr = r.issuer;

        if(r.serialNumber !== cert.serialNumber) {
          continue;
        }

        if(rAttr.length !== sAttr.length) {
          continue;
        }

        var match = true;
        for(var j = 0; j < sAttr.length; ++j) {
          if(rAttr[j].type !== sAttr[j].type ||
            rAttr[j].value !== sAttr[j].value) {
            match = false;
            break;
          }
        }

        if(match) {
          return r;
        }
      }

      return null;
    },

    /**
     * Decrypt enveloped content
     *
     * @param recipient The recipient object related to the private key
     * @param privKey The (RSA) private key object
     */
    decrypt: function(recipient, privKey) {
      if(msg.encryptedContent.key === undefined && recipient !== undefined &&
        privKey !== undefined) {
        switch(recipient.encryptedContent.algorithm) {
          case forge.pki.oids.rsaEncryption:
          case forge.pki.oids.desCBC:
            var key = privKey.decrypt(recipient.encryptedContent.content);
            msg.encryptedContent.key = forge.util.createBuffer(key);
            break;

          default:
            throw new Error('Unsupported asymmetric cipher, ' +
              'OID ' + recipient.encryptedContent.algorithm);
        }
      }

      _decryptContent(msg);
    },

    /**
     * Add (another) entity to list of recipients.
     *
     * @param cert The certificate of the entity to add.
     */
    addRecipient: function(cert) {
      msg.recipients.push({
        version: 0,
        issuer: cert.issuer.attributes,
        serialNumber: cert.serialNumber,
        encryptedContent: {
          // We simply assume rsaEncryption here, since forge.pki only
          // supports RSA so far.  If the PKI module supports other
          // ciphers one day, we need to modify this one as well.
          algorithm: forge.pki.oids.rsaEncryption,
          key: cert.publicKey
        }
      });
    },

    /**
     * Encrypt enveloped content.
     *
     * This function supports two optional arguments, cipher and key, which
     * can be used to influence symmetric encryption.  Unless cipher is
     * provided, the cipher specified in encryptedContent.algorithm is used
     * (defaults to AES-256-CBC).  If no key is provided, encryptedContent.key
     * is (re-)used.  If that one's not set, a random key will be generated
     * automatically.
     *
     * @param [key] The key to be used for symmetric encryption.
     * @param [cipher] The OID of the symmetric cipher to use.
     */
    encrypt: function(key, cipher) {
      // Part 1: Symmetric encryption
      if(msg.encryptedContent.content === undefined) {
        cipher = cipher || msg.encryptedContent.algorithm;
        key = key || msg.encryptedContent.key;

        var keyLen, ivLen, ciphFn;
        switch(cipher) {
          case forge.pki.oids['aes128-CBC']:
            keyLen = 16;
            ivLen = 16;
            ciphFn = forge.aes.createEncryptionCipher;
            break;

          case forge.pki.oids['aes192-CBC']:
            keyLen = 24;
            ivLen = 16;
            ciphFn = forge.aes.createEncryptionCipher;
            break;

          case forge.pki.oids['aes256-CBC']:
            keyLen = 32;
            ivLen = 16;
            ciphFn = forge.aes.createEncryptionCipher;
            break;

          case forge.pki.oids['des-EDE3-CBC']:
            keyLen = 24;
            ivLen = 8;
            ciphFn = forge.des.createEncryptionCipher;
            break;

          default:
            throw new Error('Unsupported symmetric cipher, OID ' + cipher);
        }

        if(key === undefined) {
          key = forge.util.createBuffer(forge.random.getBytes(keyLen));
        } else if(key.length() != keyLen) {
          throw new Error('Symmetric key has wrong length; ' +
            'got ' + key.length() + ' bytes, expected ' + keyLen + '.');
        }

        // Keep a copy of the key & IV in the object, so the caller can
        // use it for whatever reason.
        msg.encryptedContent.algorithm = cipher;
        msg.encryptedContent.key = key;
        msg.encryptedContent.parameter = forge.util.createBuffer(
          forge.random.getBytes(ivLen));

        var ciph = ciphFn(key);
        ciph.start(msg.encryptedContent.parameter.copy());
        ciph.update(msg.content);

        // The finish function does PKCS#7 padding by default, therefore
        // no action required by us.
        if(!ciph.finish()) {
          throw new Error('Symmetric encryption failed.');
        }

        msg.encryptedContent.content = ciph.output;
      }

      // Part 2: asymmetric encryption for each recipient
      for(var i = 0; i < msg.recipients.length; ++i) {
        var recipient = msg.recipients[i];

        // Nothing to do, encryption already done.
        if(recipient.encryptedContent.content !== undefined) {
          continue;
        }

        switch(recipient.encryptedContent.algorithm) {
          case forge.pki.oids.rsaEncryption:
            recipient.encryptedContent.content =
              recipient.encryptedContent.key.encrypt(
                msg.encryptedContent.key.data);
            break;

          default:
            throw new Error('Unsupported asymmetric cipher, OID ' +
              recipient.encryptedContent.algorithm);
        }
      }
    }
  };
  return msg;
};

/**
 * Converts a single recipient from an ASN.1 object.
 *
 * @param obj the ASN.1 RecipientInfo.
 *
 * @return the recipient object.
 */
function _recipientFromAsn1(obj) {
  // validate EnvelopedData content block and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, p7.asn1.recipientInfoValidator, capture, errors)) {
    var error = new Error('Cannot read PKCS#7 RecipientInfo. ' +
      'ASN.1 object is not an PKCS#7 RecipientInfo.');
    error.errors = errors;
    throw error;
  }

  return {
    version: capture.version.charCodeAt(0),
    issuer: forge.pki.RDNAttributesAsArray(capture.issuer),
    serialNumber: forge.util.createBuffer(capture.serial).toHex(),
    encryptedContent: {
      algorithm: asn1.derToOid(capture.encAlgorithm),
      parameter: capture.encParameter ? capture.encParameter.value : undefined,
      content: capture.encKey
    }
  };
}

/**
 * Converts a single recipient object to an ASN.1 object.
 *
 * @param obj the recipient object.
 *
 * @return the ASN.1 RecipientInfo.
 */
function _recipientToAsn1(obj) {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // Version
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      asn1.integerToDer(obj.version).getBytes()),
    // IssuerAndSerialNumber
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // Name
      forge.pki.distinguishedNameToAsn1({attributes: obj.issuer}),
      // Serial
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        forge.util.hexToBytes(obj.serialNumber))
    ]),
    // KeyEncryptionAlgorithmIdentifier
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // Algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(obj.encryptedContent.algorithm).getBytes()),
      // Parameter, force NULL, only RSA supported for now.
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
    ]),
    // EncryptedKey
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
      obj.encryptedContent.content)
  ]);
}

/**
 * Map a set of RecipientInfo ASN.1 objects to recipient objects.
 *
 * @param infos an array of ASN.1 representations RecipientInfo (i.e. SET OF).
 *
 * @return an array of recipient objects.
 */
function _recipientsFromAsn1(infos) {
  var ret = [];
  for(var i = 0; i < infos.length; ++i) {
    ret.push(_recipientFromAsn1(infos[i]));
  }
  return ret;
}

/**
 * Map an array of recipient objects to ASN.1 RecipientInfo objects.
 *
 * @param recipients an array of recipientInfo objects.
 *
 * @return an array of ASN.1 RecipientInfos.
 */
function _recipientsToAsn1(recipients) {
  var ret = [];
  for(var i = 0; i < recipients.length; ++i) {
    ret.push(_recipientToAsn1(recipients[i]));
  }
  return ret;
}

/**
 * Converts a single signer from an ASN.1 object.
 *
 * @param obj the ASN.1 representation of a SignerInfo.
 *
 * @return the signer object.
 */
function _signerFromAsn1(obj) {
  // validate EnvelopedData content block and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, p7.asn1.signerInfoValidator, capture, errors)) {
    var error = new Error('Cannot read PKCS#7 SignerInfo. ' +
      'ASN.1 object is not an PKCS#7 SignerInfo.');
    error.errors = errors;
    throw error;
  }

  var rval = {
    version: capture.version.charCodeAt(0),
    issuer: forge.pki.RDNAttributesAsArray(capture.issuer),
    serialNumber: forge.util.createBuffer(capture.serial).toHex(),
    digestAlgorithm: asn1.derToOid(capture.digestAlgorithm),
    signatureAlgorithm: asn1.derToOid(capture.signatureAlgorithm),
    signature: capture.signature,
    authenticatedAttributes: [],
    unauthenticatedAttributes: []
  };

  // TODO: convert attributes
  var authenticatedAttributes = capture.authenticatedAttributes || [];
  var unauthenticatedAttributes = capture.unauthenticatedAttributes || [];

  return rval;
}

/**
 * Converts a single signerInfo object to an ASN.1 object.
 *
 * @param obj the signerInfo object.
 *
 * @return the ASN.1 representation of a SignerInfo.
 */
function _signerToAsn1(obj) {
  // SignerInfo
  var rval = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      asn1.integerToDer(obj.version).getBytes()),
    // issuerAndSerialNumber
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // name
      forge.pki.distinguishedNameToAsn1({attributes: obj.issuer}),
      // serial
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        forge.util.hexToBytes(obj.serialNumber))
    ]),
    // digestAlgorithm
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(obj.digestAlgorithm).getBytes()),
      // parameters (null)
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
    ])
  ]);

  // authenticatedAttributes (OPTIONAL)
  if(obj.authenticatedAttributesAsn1) {
    // add ASN.1 previously generated during signing
    rval.value.push(obj.authenticatedAttributesAsn1);
  }

  // digestEncryptionAlgorithm
  rval.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // algorithm
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
      asn1.oidToDer(obj.signatureAlgorithm).getBytes()),
    // parameters (null)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
  ]));

  // encryptedDigest
  rval.value.push(asn1.create(
    asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, obj.signature));

  // unauthenticatedAttributes (OPTIONAL)
  if(obj.unauthenticatedAttributes.length > 0) {
    // [1] IMPLICIT
    var attrsAsn1 = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, []);
    for(var i = 0; i < obj.unauthenticatedAttributes.length; ++i) {
      var attr = obj.unauthenticatedAttributes[i];
      attrsAsn1.values.push(_attributeToAsn1(attr));
    }
    rval.value.push(attrsAsn1);
  }

  return rval;
}

/**
 * Map a set of SignerInfo ASN.1 objects to an array of signer objects.
 *
 * @param signerInfoAsn1s an array of ASN.1 SignerInfos (i.e. SET OF).
 *
 * @return an array of signers objects.
 */
function _signersFromAsn1(signerInfoAsn1s) {
  var ret = [];
  for(var i = 0; i < signerInfoAsn1s.length; ++i) {
    ret.push(_signerFromAsn1(signerInfoAsn1s[i]));
  }
  return ret;
}

/**
 * Map an array of signer objects to ASN.1 objects.
 *
 * @param signers an array of signer objects.
 *
 * @return an array of ASN.1 SignerInfos.
 */
function _signersToAsn1(signers) {
  var ret = [];
  for(var i = 0; i < signers.length; ++i) {
    ret.push(_signerToAsn1(signers[i]));
  }
  return ret;
}

/**
 * Convert an attribute object to an ASN.1 Attribute.
 *
 * @param attr the attribute object.
 *
 * @return the ASN.1 Attribute.
 */
function _attributeToAsn1(attr) {
  var value;

  // TODO: generalize to support more attributes
  if(attr.type === forge.pki.oids.contentType) {
    value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
      asn1.oidToDer(attr.value).getBytes());
  } else if(attr.type === forge.pki.oids.messageDigest) {
    value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
      attr.value.bytes());
  } else if(attr.type === forge.pki.oids.signingTime) {
    /* Note per RFC 2985: Dates between 1 January 1950 and 31 December 2049
      (inclusive) MUST be encoded as UTCTime. Any dates with year values
      before 1950 or after 2049 MUST be encoded as GeneralizedTime. [Further,]
      UTCTime values MUST be expressed in Greenwich Mean Time (Zulu) and MUST
      include seconds (i.e., times are YYMMDDHHMMSSZ), even where the
      number of seconds is zero.  Midnight (GMT) must be represented as
      "YYMMDD000000Z". */
    // TODO: make these module-level constants
    var jan_1_1950 = new Date('1950-01-01T00:00:00Z');
    var jan_1_2050 = new Date('2050-01-01T00:00:00Z');
    var date = attr.value;
    if(typeof date === 'string') {
      // try to parse date
      var timestamp = Date.parse(date);
      if(!isNaN(timestamp)) {
        date = new Date(timestamp);
      } else if(date.length === 13) {
        // YYMMDDHHMMSSZ (13 chars for UTCTime)
        date = asn1.utcTimeToDate(date);
      } else {
        // assume generalized time
        date = asn1.generalizedTimeToDate(date);
      }
    }

    if(date >= jan_1_1950 && date < jan_1_2050) {
      value = asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, false,
        asn1.dateToUtcTime(date));
    } else {
      value = asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.GENERALIZEDTIME, false,
        asn1.dateToGeneralizedTime(date));
    }
  }

  // TODO: expose as common API call
  // create a RelativeDistinguishedName set
  // each value in the set is an AttributeTypeAndValue first
  // containing the type (an OID) and second the value
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // AttributeType
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
      asn1.oidToDer(attr.type).getBytes()),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
      // AttributeValue
      value
    ])
  ]);
}

/**
 * Map messages encrypted content to ASN.1 objects.
 *
 * @param ec The encryptedContent object of the message.
 *
 * @return ASN.1 representation of the encryptedContent object (SEQUENCE).
 */
function _encryptedContentToAsn1(ec) {
  return [
    // ContentType, always Data for the moment
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
      asn1.oidToDer(forge.pki.oids.data).getBytes()),
    // ContentEncryptionAlgorithmIdentifier
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // Algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(ec.algorithm).getBytes()),
      // Parameters (IV)
      !ec.parameter ?
        undefined :
        asn1.create(
          asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
          ec.parameter.getBytes())
    ]),
    // [0] EncryptedContent
    asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
        ec.content.getBytes())
    ])
  ];
}

/**
 * Reads the "common part" of an PKCS#7 content block (in ASN.1 format)
 *
 * This function reads the "common part" of the PKCS#7 content blocks
 * EncryptedData and EnvelopedData, i.e. version number and symmetrically
 * encrypted content block.
 *
 * The result of the ASN.1 validate and capture process is returned
 * to allow the caller to extract further data, e.g. the list of recipients
 * in case of a EnvelopedData object.
 *
 * @param msg the PKCS#7 object to read the data to.
 * @param obj the ASN.1 representation of the content block.
 * @param validator the ASN.1 structure validator object to use.
 *
 * @return the value map captured by validator object.
 */
function _fromAsn1(msg, obj, validator) {
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, validator, capture, errors)) {
    var error = new Error('Cannot read PKCS#7 message. ' +
      'ASN.1 object is not a supported PKCS#7 message.');
    error.errors = error;
    throw error;
  }

  // Check contentType, so far we only support (raw) Data.
  var contentType = asn1.derToOid(capture.contentType);
  if(contentType !== forge.pki.oids.data) {
    throw new Error('Unsupported PKCS#7 message. ' +
      'Only wrapped ContentType Data supported.');
  }

  if(capture.encryptedContent) {
    var content = '';
    if(forge.util.isArray(capture.encryptedContent)) {
      for(var i = 0; i < capture.encryptedContent.length; ++i) {
        if(capture.encryptedContent[i].type !== asn1.Type.OCTETSTRING) {
          throw new Error('Malformed PKCS#7 message, expecting encrypted ' +
            'content constructed of only OCTET STRING objects.');
        }
        content += capture.encryptedContent[i].value;
      }
    } else {
      content = capture.encryptedContent;
    }
    msg.encryptedContent = {
      algorithm: asn1.derToOid(capture.encAlgorithm),
      parameter: forge.util.createBuffer(capture.encParameter.value),
      content: forge.util.createBuffer(content)
    };
  }

  if(capture.content) {
    var content = '';
    if(forge.util.isArray(capture.content)) {
      for(var i = 0; i < capture.content.length; ++i) {
        if(capture.content[i].type !== asn1.Type.OCTETSTRING) {
          throw new Error('Malformed PKCS#7 message, expecting ' +
            'content constructed of only OCTET STRING objects.');
        }
        content += capture.content[i].value;
      }
    } else {
      content = capture.content;
    }
    msg.content = forge.util.createBuffer(content);
  }

  msg.version = capture.version.charCodeAt(0);
  msg.rawCapture = capture;

  return capture;
}

/**
 * Decrypt the symmetrically encrypted content block of the PKCS#7 message.
 *
 * Decryption is skipped in case the PKCS#7 message object already has a
 * (decrypted) content attribute.  The algorithm, key and cipher parameters
 * (probably the iv) are taken from the encryptedContent attribute of the
 * message object.
 *
 * @param The PKCS#7 message object.
 */
function _decryptContent(msg) {
  if(msg.encryptedContent.key === undefined) {
    throw new Error('Symmetric key not available.');
  }

  if(msg.content === undefined) {
    var ciph;

    switch(msg.encryptedContent.algorithm) {
      case forge.pki.oids['aes128-CBC']:
      case forge.pki.oids['aes192-CBC']:
      case forge.pki.oids['aes256-CBC']:
        ciph = forge.aes.createDecryptionCipher(msg.encryptedContent.key);
        break;

      case forge.pki.oids['desCBC']:
      case forge.pki.oids['des-EDE3-CBC']:
        ciph = forge.des.createDecryptionCipher(msg.encryptedContent.key);
        break;

      default:
        throw new Error('Unsupported symmetric cipher, OID ' +
          msg.encryptedContent.algorithm);
    }
    ciph.start(msg.encryptedContent.parameter);
    ciph.update(msg.encryptedContent.content);

    if(!ciph.finish()) {
      throw new Error('Symmetric decryption failed.');
    }

    msg.content = ciph.output;
  }
}
