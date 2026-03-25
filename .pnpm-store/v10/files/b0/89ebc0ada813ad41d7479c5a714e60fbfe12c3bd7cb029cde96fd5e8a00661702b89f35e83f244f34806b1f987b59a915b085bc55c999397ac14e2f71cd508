/**
 * Javascript implementation of X.509 and related components (such as
 * Certification Signing Requests) of a Public Key Infrastructure.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2014 Digital Bazaar, Inc.
 *
 * The ASN.1 representation of an X.509v3 certificate is as follows
 * (see RFC 2459):
 *
 * Certificate ::= SEQUENCE {
 *   tbsCertificate       TBSCertificate,
 *   signatureAlgorithm   AlgorithmIdentifier,
 *   signatureValue       BIT STRING
 * }
 *
 * TBSCertificate ::= SEQUENCE {
 *   version         [0]  EXPLICIT Version DEFAULT v1,
 *   serialNumber         CertificateSerialNumber,
 *   signature            AlgorithmIdentifier,
 *   issuer               Name,
 *   validity             Validity,
 *   subject              Name,
 *   subjectPublicKeyInfo SubjectPublicKeyInfo,
 *   issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
 *                        -- If present, version shall be v2 or v3
 *   subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
 *                        -- If present, version shall be v2 or v3
 *   extensions      [3]  EXPLICIT Extensions OPTIONAL
 *                        -- If present, version shall be v3
 * }
 *
 * Version ::= INTEGER  { v1(0), v2(1), v3(2) }
 *
 * CertificateSerialNumber ::= INTEGER
 *
 * Name ::= CHOICE {
 *   // only one possible choice for now
 *   RDNSequence
 * }
 *
 * RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
 *
 * RelativeDistinguishedName ::= SET OF AttributeTypeAndValue
 *
 * AttributeTypeAndValue ::= SEQUENCE {
 *   type     AttributeType,
 *   value    AttributeValue
 * }
 * AttributeType ::= OBJECT IDENTIFIER
 * AttributeValue ::= ANY DEFINED BY AttributeType
 *
 * Validity ::= SEQUENCE {
 *   notBefore      Time,
 *   notAfter       Time
 * }
 *
 * Time ::= CHOICE {
 *   utcTime        UTCTime,
 *   generalTime    GeneralizedTime
 * }
 *
 * UniqueIdentifier ::= BIT STRING
 *
 * SubjectPublicKeyInfo ::= SEQUENCE {
 *   algorithm            AlgorithmIdentifier,
 *   subjectPublicKey     BIT STRING
 * }
 *
 * Extensions ::= SEQUENCE SIZE (1..MAX) OF Extension
 *
 * Extension ::= SEQUENCE {
 *   extnID      OBJECT IDENTIFIER,
 *   critical    BOOLEAN DEFAULT FALSE,
 *   extnValue   OCTET STRING
 * }
 *
 * The only key algorithm currently supported for PKI is RSA.
 *
 * RSASSA-PSS signatures are described in RFC 3447 and RFC 4055.
 *
 * PKCS#10 v1.7 describes certificate signing requests:
 *
 * CertificationRequestInfo:
 *
 * CertificationRequestInfo ::= SEQUENCE {
 *   version       INTEGER { v1(0) } (v1,...),
 *   subject       Name,
 *   subjectPKInfo SubjectPublicKeyInfo{{ PKInfoAlgorithms }},
 *   attributes    [0] Attributes{{ CRIAttributes }}
 * }
 *
 * Attributes { ATTRIBUTE:IOSet } ::= SET OF Attribute{{ IOSet }}
 *
 * CRIAttributes  ATTRIBUTE  ::= {
 *   ... -- add any locally defined attributes here -- }
 *
 * Attribute { ATTRIBUTE:IOSet } ::= SEQUENCE {
 *   type   ATTRIBUTE.&id({IOSet}),
 *   values SET SIZE(1..MAX) OF ATTRIBUTE.&Type({IOSet}{@type})
 * }
 *
 * CertificationRequest ::= SEQUENCE {
 *   certificationRequestInfo CertificationRequestInfo,
 *   signatureAlgorithm AlgorithmIdentifier{{ SignatureAlgorithms }},
 *   signature          BIT STRING
 * }
 */
var forge = require('./forge');
require('./aes');
require('./asn1');
require('./des');
require('./md');
require('./mgf');
require('./oids');
require('./pem');
require('./pss');
require('./rsa');
require('./util');

// shortcut for asn.1 API
var asn1 = forge.asn1;

/* Public Key Infrastructure (PKI) implementation. */
var pki = module.exports = forge.pki = forge.pki || {};
var oids = pki.oids;

// short name OID mappings
var _shortNames = {};
_shortNames['CN'] = oids['commonName'];
_shortNames['commonName'] = 'CN';
_shortNames['C'] = oids['countryName'];
_shortNames['countryName'] = 'C';
_shortNames['L'] = oids['localityName'];
_shortNames['localityName'] = 'L';
_shortNames['ST'] = oids['stateOrProvinceName'];
_shortNames['stateOrProvinceName'] = 'ST';
_shortNames['O'] = oids['organizationName'];
_shortNames['organizationName'] = 'O';
_shortNames['OU'] = oids['organizationalUnitName'];
_shortNames['organizationalUnitName'] = 'OU';
_shortNames['E'] = oids['emailAddress'];
_shortNames['emailAddress'] = 'E';

// validator for an SubjectPublicKeyInfo structure
// Note: Currently only works with an RSA public key
var publicKeyValidator = forge.pki.rsa.publicKeyValidator;

// validator for an X.509v3 certificate
var x509CertificateValidator = {
  name: 'Certificate',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'Certificate.TBSCertificate',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: 'tbsCertificate',
    value: [{
      name: 'Certificate.TBSCertificate.version',
      tagClass: asn1.Class.CONTEXT_SPECIFIC,
      type: 0,
      constructed: true,
      optional: true,
      value: [{
        name: 'Certificate.TBSCertificate.version.integer',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: 'certVersion'
      }]
    }, {
      name: 'Certificate.TBSCertificate.serialNumber',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.INTEGER,
      constructed: false,
      capture: 'certSerialNumber'
    }, {
      name: 'Certificate.TBSCertificate.signature',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      value: [{
        name: 'Certificate.TBSCertificate.signature.algorithm',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: 'certinfoSignatureOid'
      }, {
        name: 'Certificate.TBSCertificate.signature.parameters',
        tagClass: asn1.Class.UNIVERSAL,
        optional: true,
        captureAsn1: 'certinfoSignatureParams'
      }]
    }, {
      name: 'Certificate.TBSCertificate.issuer',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      captureAsn1: 'certIssuer'
    }, {
      name: 'Certificate.TBSCertificate.validity',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      // Note: UTC and generalized times may both appear so the capture
      // names are based on their detected order, the names used below
      // are only for the common case, which validity time really means
      // "notBefore" and which means "notAfter" will be determined by order
      value: [{
        // notBefore (Time) (UTC time case)
        name: 'Certificate.TBSCertificate.validity.notBefore (utc)',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.UTCTIME,
        constructed: false,
        optional: true,
        capture: 'certValidity1UTCTime'
      }, {
        // notBefore (Time) (generalized time case)
        name: 'Certificate.TBSCertificate.validity.notBefore (generalized)',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.GENERALIZEDTIME,
        constructed: false,
        optional: true,
        capture: 'certValidity2GeneralizedTime'
      }, {
        // notAfter (Time) (only UTC time is supported)
        name: 'Certificate.TBSCertificate.validity.notAfter (utc)',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.UTCTIME,
        constructed: false,
        optional: true,
        capture: 'certValidity3UTCTime'
      }, {
        // notAfter (Time) (only UTC time is supported)
        name: 'Certificate.TBSCertificate.validity.notAfter (generalized)',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.GENERALIZEDTIME,
        constructed: false,
        optional: true,
        capture: 'certValidity4GeneralizedTime'
      }]
    }, {
      // Name (subject) (RDNSequence)
      name: 'Certificate.TBSCertificate.subject',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      captureAsn1: 'certSubject'
    },
    // SubjectPublicKeyInfo
    publicKeyValidator,
    {
      // issuerUniqueID (optional)
      name: 'Certificate.TBSCertificate.issuerUniqueID',
      tagClass: asn1.Class.CONTEXT_SPECIFIC,
      type: 1,
      constructed: true,
      optional: true,
      value: [{
        name: 'Certificate.TBSCertificate.issuerUniqueID.id',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        // TODO: support arbitrary bit length ids
        captureBitStringValue: 'certIssuerUniqueId'
      }]
    }, {
      // subjectUniqueID (optional)
      name: 'Certificate.TBSCertificate.subjectUniqueID',
      tagClass: asn1.Class.CONTEXT_SPECIFIC,
      type: 2,
      constructed: true,
      optional: true,
      value: [{
        name: 'Certificate.TBSCertificate.subjectUniqueID.id',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        // TODO: support arbitrary bit length ids
        captureBitStringValue: 'certSubjectUniqueId'
      }]
    }, {
      // Extensions (optional)
      name: 'Certificate.TBSCertificate.extensions',
      tagClass: asn1.Class.CONTEXT_SPECIFIC,
      type: 3,
      constructed: true,
      captureAsn1: 'certExtensions',
      optional: true
    }]
  }, {
    // AlgorithmIdentifier (signature algorithm)
    name: 'Certificate.signatureAlgorithm',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
      // algorithm
      name: 'Certificate.signatureAlgorithm.algorithm',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.OID,
      constructed: false,
      capture: 'certSignatureOid'
    }, {
      name: 'Certificate.TBSCertificate.signature.parameters',
      tagClass: asn1.Class.UNIVERSAL,
      optional: true,
      captureAsn1: 'certSignatureParams'
    }]
  }, {
    // SignatureValue
    name: 'Certificate.signatureValue',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.BITSTRING,
    constructed: false,
    captureBitStringValue: 'certSignature'
  }]
};

var rsassaPssParameterValidator = {
  name: 'rsapss',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [{
    name: 'rsapss.hashAlgorithm',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    type: 0,
    constructed: true,
    value: [{
      name: 'rsapss.hashAlgorithm.AlgorithmIdentifier',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Class.SEQUENCE,
      constructed: true,
      optional: true,
      value: [{
        name: 'rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: 'hashOid'
        /* parameter block omitted, for SHA1 NULL anyhow. */
      }]
    }]
  }, {
    name: 'rsapss.maskGenAlgorithm',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    type: 1,
    constructed: true,
    value: [{
      name: 'rsapss.maskGenAlgorithm.AlgorithmIdentifier',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Class.SEQUENCE,
      constructed: true,
      optional: true,
      value: [{
        name: 'rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: 'maskGenOid'
      }, {
        name: 'rsapss.maskGenAlgorithm.AlgorithmIdentifier.params',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
          name: 'rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm',
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: false,
          capture: 'maskGenHashOid'
          /* parameter block omitted, for SHA1 NULL anyhow. */
        }]
      }]
    }]
  }, {
    name: 'rsapss.saltLength',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    type: 2,
    optional: true,
    value: [{
      name: 'rsapss.saltLength.saltLength',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Class.INTEGER,
      constructed: false,
      capture: 'saltLength'
    }]
  }, {
    name: 'rsapss.trailerField',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    type: 3,
    optional: true,
    value: [{
      name: 'rsapss.trailer.trailer',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Class.INTEGER,
      constructed: false,
      capture: 'trailer'
    }]
  }]
};

// validator for a CertificationRequestInfo structure
var certificationRequestInfoValidator = {
  name: 'CertificationRequestInfo',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  captureAsn1: 'certificationRequestInfo',
  value: [{
    name: 'CertificationRequestInfo.integer',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.INTEGER,
    constructed: false,
    capture: 'certificationRequestInfoVersion'
  }, {
    // Name (subject) (RDNSequence)
    name: 'CertificationRequestInfo.subject',
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: 'certificationRequestInfoSubject'
  },
  // SubjectPublicKeyInfo
  publicKeyValidator,
  {
    name: 'CertificationRequestInfo.attributes',
    tagClass: asn1.Class.CONTEXT_SPECIFIC,
    type: 0,
    constructed: true,
    optional: true,
    capture: 'certificationRequestInfoAttributes',
    value: [{
      name: 'CertificationRequestInfo.attributes',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      value: [{
        name: 'CertificationRequestInfo.attributes.type',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false
      }, {
        name: 'CertificationRequestInfo.attributes.value',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: true
      }]
    }]
  }]
};

// validator for a CertificationRequest structure
var certificationRequestValidator = {
  name: 'CertificationRequest',
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  captureAsn1: 'csr',
  value: [
    certificationRequestInfoValidator, {
      // AlgorithmIdentifier (signature algorithm)
      name: 'CertificationRequest.signatureAlgorithm',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      value: [{
        // algorithm
        name: 'CertificationRequest.signatureAlgorithm.algorithm',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: 'csrSignatureOid'
      }, {
        name: 'CertificationRequest.signatureAlgorithm.parameters',
        tagClass: asn1.Class.UNIVERSAL,
        optional: true,
        captureAsn1: 'csrSignatureParams'
      }]
    }, {
      // signature
      name: 'CertificationRequest.signature',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.BITSTRING,
      constructed: false,
      captureBitStringValue: 'csrSignature'
    }
  ]
};

/**
 * Converts an RDNSequence of ASN.1 DER-encoded RelativeDistinguishedName
 * sets into an array with objects that have type and value properties.
 *
 * @param rdn the RDNSequence to convert.
 * @param md a message digest to append type and value to if provided.
 */
pki.RDNAttributesAsArray = function(rdn, md) {
  var rval = [];

  // each value in 'rdn' in is a SET of RelativeDistinguishedName
  var set, attr, obj;
  for(var si = 0; si < rdn.value.length; ++si) {
    // get the RelativeDistinguishedName set
    set = rdn.value[si];

    // each value in the SET is an AttributeTypeAndValue sequence
    // containing first a type (an OID) and second a value (defined by
    // the OID)
    for(var i = 0; i < set.value.length; ++i) {
      obj = {};
      attr = set.value[i];
      obj.type = asn1.derToOid(attr.value[0].value);
      obj.value = attr.value[1].value;
      obj.valueTagClass = attr.value[1].type;
      // if the OID is known, get its name and short name
      if(obj.type in oids) {
        obj.name = oids[obj.type];
        if(obj.name in _shortNames) {
          obj.shortName = _shortNames[obj.name];
        }
      }
      if(md) {
        md.update(obj.type);
        md.update(obj.value);
      }
      rval.push(obj);
    }
  }

  return rval;
};

/**
 * Converts ASN.1 CRIAttributes into an array with objects that have type and
 * value properties.
 *
 * @param attributes the CRIAttributes to convert.
 */
pki.CRIAttributesAsArray = function(attributes) {
  var rval = [];

  // each value in 'attributes' in is a SEQUENCE with an OID and a SET
  for(var si = 0; si < attributes.length; ++si) {
    // get the attribute sequence
    var seq = attributes[si];

    // each value in the SEQUENCE containing first a type (an OID) and
    // second a set of values (defined by the OID)
    var type = asn1.derToOid(seq.value[0].value);
    var values = seq.value[1].value;
    for(var vi = 0; vi < values.length; ++vi) {
      var obj = {};
      obj.type = type;
      obj.value = values[vi].value;
      obj.valueTagClass = values[vi].type;
      // if the OID is known, get its name and short name
      if(obj.type in oids) {
        obj.name = oids[obj.type];
        if(obj.name in _shortNames) {
          obj.shortName = _shortNames[obj.name];
        }
      }
      // parse extensions
      if(obj.type === oids.extensionRequest) {
        obj.extensions = [];
        for(var ei = 0; ei < obj.value.length; ++ei) {
          obj.extensions.push(pki.certificateExtensionFromAsn1(obj.value[ei]));
        }
      }
      rval.push(obj);
    }
  }

  return rval;
};

/**
 * Gets an issuer or subject attribute from its name, type, or short name.
 *
 * @param obj the issuer or subject object.
 * @param options a short name string or an object with:
 *          shortName the short name for the attribute.
 *          name the name for the attribute.
 *          type the type for the attribute.
 *
 * @return the attribute.
 */
function _getAttribute(obj, options) {
  if(typeof options === 'string') {
    options = {shortName: options};
  }

  var rval = null;
  var attr;
  for(var i = 0; rval === null && i < obj.attributes.length; ++i) {
    attr = obj.attributes[i];
    if(options.type && options.type === attr.type) {
      rval = attr;
    } else if(options.name && options.name === attr.name) {
      rval = attr;
    } else if(options.shortName && options.shortName === attr.shortName) {
      rval = attr;
    }
  }
  return rval;
}

/**
 * Converts signature parameters from ASN.1 structure.
 *
 * Currently only RSASSA-PSS supported.  The PKCS#1 v1.5 signature scheme had
 * no parameters.
 *
 * RSASSA-PSS-params  ::=  SEQUENCE  {
 *   hashAlgorithm      [0] HashAlgorithm DEFAULT
 *                             sha1Identifier,
 *   maskGenAlgorithm   [1] MaskGenAlgorithm DEFAULT
 *                             mgf1SHA1Identifier,
 *   saltLength         [2] INTEGER DEFAULT 20,
 *   trailerField       [3] INTEGER DEFAULT 1
 * }
 *
 * HashAlgorithm  ::=  AlgorithmIdentifier
 *
 * MaskGenAlgorithm  ::=  AlgorithmIdentifier
 *
 * AlgorithmIdentifer ::= SEQUENCE {
 *   algorithm OBJECT IDENTIFIER,
 *   parameters ANY DEFINED BY algorithm OPTIONAL
 * }
 *
 * @param oid The OID specifying the signature algorithm
 * @param obj The ASN.1 structure holding the parameters
 * @param fillDefaults Whether to use return default values where omitted
 * @return signature parameter object
 */
var _readSignatureParameters = function(oid, obj, fillDefaults) {
  var params = {};

  if(oid !== oids['RSASSA-PSS']) {
    return params;
  }

  if(fillDefaults) {
    params = {
      hash: {
        algorithmOid: oids['sha1']
      },
      mgf: {
        algorithmOid: oids['mgf1'],
        hash: {
          algorithmOid: oids['sha1']
        }
      },
      saltLength: 20
    };
  }

  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, rsassaPssParameterValidator, capture, errors)) {
    var error = new Error('Cannot read RSASSA-PSS parameter block.');
    error.errors = errors;
    throw error;
  }

  if(capture.hashOid !== undefined) {
    params.hash = params.hash || {};
    params.hash.algorithmOid = asn1.derToOid(capture.hashOid);
  }

  if(capture.maskGenOid !== undefined) {
    params.mgf = params.mgf || {};
    params.mgf.algorithmOid = asn1.derToOid(capture.maskGenOid);
    params.mgf.hash = params.mgf.hash || {};
    params.mgf.hash.algorithmOid = asn1.derToOid(capture.maskGenHashOid);
  }

  if(capture.saltLength !== undefined) {
    params.saltLength = capture.saltLength.charCodeAt(0);
  }

  return params;
};

/**
 * Create signature digest for OID.
 *
 * @param options
 *   signatureOid: the OID specifying the signature algorithm.
 *   type: a human readable type for error messages
 * @return a created md instance. throws if unknown oid.
 */
var _createSignatureDigest = function(options) {
  switch(oids[options.signatureOid]) {
    case 'sha1WithRSAEncryption':
    // deprecated alias
    case 'sha1WithRSASignature':
      return forge.md.sha1.create();
    case 'md5WithRSAEncryption':
      return forge.md.md5.create();
    case 'sha256WithRSAEncryption':
      return forge.md.sha256.create();
    case 'sha384WithRSAEncryption':
      return forge.md.sha384.create();
    case 'sha512WithRSAEncryption':
      return forge.md.sha512.create();
    case 'RSASSA-PSS':
      return forge.md.sha256.create();
    default:
      var error = new Error(
        'Could not compute ' + options.type + ' digest. ' +
        'Unknown signature OID.');
      error.signatureOid = options.signatureOid;
      throw error;
  }
};

/**
 * Verify signature on certificate or CSR.
 *
 * @param options:
 *   certificate the certificate or CSR to verify.
 *   md the signature digest.
 *   signature the signature
 * @return a created md instance. throws if unknown oid.
 */
var _verifySignature = function(options) {
  var cert = options.certificate;
  var scheme;

  switch(cert.signatureOid) {
    case oids.sha1WithRSAEncryption:
    // deprecated alias
    case oids.sha1WithRSASignature:
      /* use PKCS#1 v1.5 padding scheme */
      break;
    case oids['RSASSA-PSS']:
      var hash, mgf;

      /* initialize mgf */
      hash = oids[cert.signatureParameters.mgf.hash.algorithmOid];
      if(hash === undefined || forge.md[hash] === undefined) {
        var error = new Error('Unsupported MGF hash function.');
        error.oid = cert.signatureParameters.mgf.hash.algorithmOid;
        error.name = hash;
        throw error;
      }

      mgf = oids[cert.signatureParameters.mgf.algorithmOid];
      if(mgf === undefined || forge.mgf[mgf] === undefined) {
        var error = new Error('Unsupported MGF function.');
        error.oid = cert.signatureParameters.mgf.algorithmOid;
        error.name = mgf;
        throw error;
      }

      mgf = forge.mgf[mgf].create(forge.md[hash].create());

      /* initialize hash function */
      hash = oids[cert.signatureParameters.hash.algorithmOid];
      if(hash === undefined || forge.md[hash] === undefined) {
        var error = new Error('Unsupported RSASSA-PSS hash function.');
        error.oid = cert.signatureParameters.hash.algorithmOid;
        error.name = hash;
        throw error;
      }

      scheme = forge.pss.create(
        forge.md[hash].create(), mgf, cert.signatureParameters.saltLength
      );
      break;
  }

  // verify signature on cert using public key
  return cert.publicKey.verify(
    options.md.digest().getBytes(), options.signature, scheme
  );
};

/**
 * Converts an X.509 certificate from PEM format.
 *
 * Note: If the certificate is to be verified then compute hash should
 * be set to true. This will scan the TBSCertificate part of the ASN.1
 * object while it is converted so it doesn't need to be converted back
 * to ASN.1-DER-encoding later.
 *
 * @param pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 * @param strict true to be strict when checking ASN.1 value lengths, false to
 *          allow truncated values (default: true).
 *
 * @return the certificate.
 */
pki.certificateFromPem = function(pem, computeHash, strict) {
  var msg = forge.pem.decode(pem)[0];

  if(msg.type !== 'CERTIFICATE' &&
    msg.type !== 'X509 CERTIFICATE' &&
    msg.type !== 'TRUSTED CERTIFICATE') {
    var error = new Error(
      'Could not convert certificate from PEM; PEM header type ' +
      'is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');
    error.headerType = msg.type;
    throw error;
  }
  if(msg.procType && msg.procType.type === 'ENCRYPTED') {
    throw new Error(
      'Could not convert certificate from PEM; PEM is encrypted.');
  }

  // convert DER to ASN.1 object
  var obj = asn1.fromDer(msg.body, strict);

  return pki.certificateFromAsn1(obj, computeHash);
};

/**
 * Converts an X.509 certificate to PEM format.
 *
 * @param cert the certificate.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted certificate.
 */
pki.certificateToPem = function(cert, maxline) {
  // convert to ASN.1, then DER, then PEM-encode
  var msg = {
    type: 'CERTIFICATE',
    body: asn1.toDer(pki.certificateToAsn1(cert)).getBytes()
  };
  return forge.pem.encode(msg, {maxline: maxline});
};

/**
 * Converts an RSA public key from PEM format.
 *
 * @param pem the PEM-formatted public key.
 *
 * @return the public key.
 */
pki.publicKeyFromPem = function(pem) {
  var msg = forge.pem.decode(pem)[0];

  if(msg.type !== 'PUBLIC KEY' && msg.type !== 'RSA PUBLIC KEY') {
    var error = new Error('Could not convert public key from PEM; PEM header ' +
      'type is not "PUBLIC KEY" or "RSA PUBLIC KEY".');
    error.headerType = msg.type;
    throw error;
  }
  if(msg.procType && msg.procType.type === 'ENCRYPTED') {
    throw new Error('Could not convert public key from PEM; PEM is encrypted.');
  }

  // convert DER to ASN.1 object
  var obj = asn1.fromDer(msg.body);

  return pki.publicKeyFromAsn1(obj);
};

/**
 * Converts an RSA public key to PEM format (using a SubjectPublicKeyInfo).
 *
 * @param key the public key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted public key.
 */
pki.publicKeyToPem = function(key, maxline) {
  // convert to ASN.1, then DER, then PEM-encode
  var msg = {
    type: 'PUBLIC KEY',
    body: asn1.toDer(pki.publicKeyToAsn1(key)).getBytes()
  };
  return forge.pem.encode(msg, {maxline: maxline});
};

/**
 * Converts an RSA public key to PEM format (using an RSAPublicKey).
 *
 * @param key the public key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted public key.
 */
pki.publicKeyToRSAPublicKeyPem = function(key, maxline) {
  // convert to ASN.1, then DER, then PEM-encode
  var msg = {
    type: 'RSA PUBLIC KEY',
    body: asn1.toDer(pki.publicKeyToRSAPublicKey(key)).getBytes()
  };
  return forge.pem.encode(msg, {maxline: maxline});
};

/**
 * Gets a fingerprint for the given public key.
 *
 * @param options the options to use.
 *          [md] the message digest object to use (defaults to forge.md.sha1).
 *          [type] the type of fingerprint, such as 'RSAPublicKey',
 *            'SubjectPublicKeyInfo' (defaults to 'RSAPublicKey').
 *          [encoding] an alternative output encoding, such as 'hex'
 *            (defaults to none, outputs a byte buffer).
 *          [delimiter] the delimiter to use between bytes for 'hex' encoded
 *            output, eg: ':' (defaults to none).
 *
 * @return the fingerprint as a byte buffer or other encoding based on options.
 */
pki.getPublicKeyFingerprint = function(key, options) {
  options = options || {};
  var md = options.md || forge.md.sha1.create();
  var type = options.type || 'RSAPublicKey';

  var bytes;
  switch(type) {
    case 'RSAPublicKey':
      bytes = asn1.toDer(pki.publicKeyToRSAPublicKey(key)).getBytes();
      break;
    case 'SubjectPublicKeyInfo':
      bytes = asn1.toDer(pki.publicKeyToAsn1(key)).getBytes();
      break;
    default:
      throw new Error('Unknown fingerprint type "' + options.type + '".');
  }

  // hash public key bytes
  md.start();
  md.update(bytes);
  var digest = md.digest();
  if(options.encoding === 'hex') {
    var hex = digest.toHex();
    if(options.delimiter) {
      return hex.match(/.{2}/g).join(options.delimiter);
    }
    return hex;
  } else if(options.encoding === 'binary') {
    return digest.getBytes();
  } else if(options.encoding) {
    throw new Error('Unknown encoding "' + options.encoding + '".');
  }
  return digest;
};

/**
 * Converts a PKCS#10 certification request (CSR) from PEM format.
 *
 * Note: If the certification request is to be verified then compute hash
 * should be set to true. This will scan the CertificationRequestInfo part of
 * the ASN.1 object while it is converted so it doesn't need to be converted
 * back to ASN.1-DER-encoding later.
 *
 * @param pem the PEM-formatted certificate.
 * @param computeHash true to compute the hash for verification.
 * @param strict true to be strict when checking ASN.1 value lengths, false to
 *          allow truncated values (default: true).
 *
 * @return the certification request (CSR).
 */
pki.certificationRequestFromPem = function(pem, computeHash, strict) {
  var msg = forge.pem.decode(pem)[0];

  if(msg.type !== 'CERTIFICATE REQUEST') {
    var error = new Error('Could not convert certification request from PEM; ' +
      'PEM header type is not "CERTIFICATE REQUEST".');
    error.headerType = msg.type;
    throw error;
  }
  if(msg.procType && msg.procType.type === 'ENCRYPTED') {
    throw new Error('Could not convert certification request from PEM; ' +
      'PEM is encrypted.');
  }

  // convert DER to ASN.1 object
  var obj = asn1.fromDer(msg.body, strict);

  return pki.certificationRequestFromAsn1(obj, computeHash);
};

/**
 * Converts a PKCS#10 certification request (CSR) to PEM format.
 *
 * @param csr the certification request.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted certification request.
 */
pki.certificationRequestToPem = function(csr, maxline) {
  // convert to ASN.1, then DER, then PEM-encode
  var msg = {
    type: 'CERTIFICATE REQUEST',
    body: asn1.toDer(pki.certificationRequestToAsn1(csr)).getBytes()
  };
  return forge.pem.encode(msg, {maxline: maxline});
};

/**
 * Creates an empty X.509v3 RSA certificate.
 *
 * @return the certificate.
 */
pki.createCertificate = function() {
  var cert = {};
  cert.version = 0x02;
  cert.serialNumber = '00';
  cert.signatureOid = null;
  cert.signature = null;
  cert.siginfo = {};
  cert.siginfo.algorithmOid = null;
  cert.validity = {};
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();

  cert.issuer = {};
  cert.issuer.getField = function(sn) {
    return _getAttribute(cert.issuer, sn);
  };
  cert.issuer.addField = function(attr) {
    _fillMissingFields([attr]);
    cert.issuer.attributes.push(attr);
  };
  cert.issuer.attributes = [];
  cert.issuer.hash = null;

  cert.subject = {};
  cert.subject.getField = function(sn) {
    return _getAttribute(cert.subject, sn);
  };
  cert.subject.addField = function(attr) {
    _fillMissingFields([attr]);
    cert.subject.attributes.push(attr);
  };
  cert.subject.attributes = [];
  cert.subject.hash = null;

  cert.extensions = [];
  cert.publicKey = null;
  cert.md = null;

  /**
   * Sets the subject of this certificate.
   *
   * @param attrs the array of subject attributes to use.
   * @param uniqueId an optional a unique ID to use.
   */
  cert.setSubject = function(attrs, uniqueId) {
    // set new attributes, clear hash
    _fillMissingFields(attrs);
    cert.subject.attributes = attrs;
    delete cert.subject.uniqueId;
    if(uniqueId) {
      // TODO: support arbitrary bit length ids
      cert.subject.uniqueId = uniqueId;
    }
    cert.subject.hash = null;
  };

  /**
   * Sets the issuer of this certificate.
   *
   * @param attrs the array of issuer attributes to use.
   * @param uniqueId an optional a unique ID to use.
   */
  cert.setIssuer = function(attrs, uniqueId) {
    // set new attributes, clear hash
    _fillMissingFields(attrs);
    cert.issuer.attributes = attrs;
    delete cert.issuer.uniqueId;
    if(uniqueId) {
      // TODO: support arbitrary bit length ids
      cert.issuer.uniqueId = uniqueId;
    }
    cert.issuer.hash = null;
  };

  /**
   * Sets the extensions of this certificate.
   *
   * @param exts the array of extensions to use.
   */
  cert.setExtensions = function(exts) {
    for(var i = 0; i < exts.length; ++i) {
      _fillMissingExtensionFields(exts[i], {cert: cert});
    }
    // set new extensions
    cert.extensions = exts;
  };

  /**
   * Gets an extension by its name or id.
   *
   * @param options the name to use or an object with:
   *          name the name to use.
   *          id the id to use.
   *
   * @return the extension or null if not found.
   */
  cert.getExtension = function(options) {
    if(typeof options === 'string') {
      options = {name: options};
    }

    var rval = null;
    var ext;
    for(var i = 0; rval === null && i < cert.extensions.length; ++i) {
      ext = cert.extensions[i];
      if(options.id && ext.id === options.id) {
        rval = ext;
      } else if(options.name && ext.name === options.name) {
        rval = ext;
      }
    }
    return rval;
  };

  /**
   * Signs this certificate using the given private key.
   *
   * @param key the private key to sign with.
   * @param md the message digest object to use (defaults to forge.md.sha1).
   */
  cert.sign = function(key, md) {
    // TODO: get signature OID from private key
    cert.md = md || forge.md.sha1.create();
    var algorithmOid = oids[cert.md.algorithm + 'WithRSAEncryption'];
    if(!algorithmOid) {
      var error = new Error('Could not compute certificate digest. ' +
        'Unknown message digest algorithm OID.');
      error.algorithm = cert.md.algorithm;
      throw error;
    }
    cert.signatureOid = cert.siginfo.algorithmOid = algorithmOid;

    // get TBSCertificate, convert to DER
    cert.tbsCertificate = pki.getTBSCertificate(cert);
    var bytes = asn1.toDer(cert.tbsCertificate);

    // digest and sign
    cert.md.update(bytes.getBytes());
    cert.signature = key.sign(cert.md);
  };

  /**
   * Attempts verify the signature on the passed certificate using this
   * certificate's public key.
   *
   * @param child the certificate to verify.
   *
   * @return true if verified, false if not.
   */
  cert.verify = function(child) {
    var rval = false;

    if(!cert.issued(child)) {
      var issuer = child.issuer;
      var subject = cert.subject;
      var error = new Error(
        'The parent certificate did not issue the given child ' +
        'certificate; the child certificate\'s issuer does not match the ' +
        'parent\'s subject.');
      error.expectedIssuer = subject.attributes;
      error.actualIssuer = issuer.attributes;
      throw error;
    }

    var md = child.md;
    if(md === null) {
      // create digest for OID signature types
      md = _createSignatureDigest({
        signatureOid: child.signatureOid,
        type: 'certificate'
      });

      // produce DER formatted TBSCertificate and digest it
      var tbsCertificate = child.tbsCertificate || pki.getTBSCertificate(child);
      var bytes = asn1.toDer(tbsCertificate);
      md.update(bytes.getBytes());
    }

    if(md !== null) {
      rval = _verifySignature({
        certificate: cert, md: md, signature: child.signature
      });
    }

    return rval;
  };

  /**
   * Returns true if this certificate's issuer matches the passed
   * certificate's subject. Note that no signature check is performed.
   *
   * @param parent the certificate to check.
   *
   * @return true if this certificate's issuer matches the passed certificate's
   *         subject.
   */
  cert.isIssuer = function(parent) {
    var rval = false;

    var i = cert.issuer;
    var s = parent.subject;

    // compare hashes if present
    if(i.hash && s.hash) {
      rval = (i.hash === s.hash);
    } else if(i.attributes.length === s.attributes.length) {
      // all attributes are the same so issuer matches subject
      rval = true;
      var iattr, sattr;
      for(var n = 0; rval && n < i.attributes.length; ++n) {
        iattr = i.attributes[n];
        sattr = s.attributes[n];
        if(iattr.type !== sattr.type || iattr.value !== sattr.value) {
          // attribute mismatch
          rval = false;
        }
      }
    }

    return rval;
  };

  /**
   * Returns true if this certificate's subject matches the issuer of the
   * given certificate). Note that not signature check is performed.
   *
   * @param child the certificate to check.
   *
   * @return true if this certificate's subject matches the passed
   *         certificate's issuer.
   */
  cert.issued = function(child) {
    return child.isIssuer(cert);
  };

  /**
   * Generates the subjectKeyIdentifier for this certificate as byte buffer.
   *
   * @return the subjectKeyIdentifier for this certificate as byte buffer.
   */
  cert.generateSubjectKeyIdentifier = function() {
    /* See: 4.2.1.2 section of the the RFC3280, keyIdentifier is either:

      (1) The keyIdentifier is composed of the 160-bit SHA-1 hash of the
        value of the BIT STRING subjectPublicKey (excluding the tag,
        length, and number of unused bits).

      (2) The keyIdentifier is composed of a four bit type field with
        the value 0100 followed by the least significant 60 bits of the
        SHA-1 hash of the value of the BIT STRING subjectPublicKey
        (excluding the tag, length, and number of unused bit string bits).
    */

    // skipping the tag, length, and number of unused bits is the same
    // as just using the RSAPublicKey (for RSA keys, which are the
    // only ones supported)
    return pki.getPublicKeyFingerprint(cert.publicKey, {type: 'RSAPublicKey'});
  };

  /**
   * Verifies the subjectKeyIdentifier extension value for this certificate
   * against its public key. If no extension is found, false will be
   * returned.
   *
   * @return true if verified, false if not.
   */
  cert.verifySubjectKeyIdentifier = function() {
    var oid = oids['subjectKeyIdentifier'];
    for(var i = 0; i < cert.extensions.length; ++i) {
      var ext = cert.extensions[i];
      if(ext.id === oid) {
        var ski = cert.generateSubjectKeyIdentifier().getBytes();
        return (forge.util.hexToBytes(ext.subjectKeyIdentifier) === ski);
      }
    }
    return false;
  };

  return cert;
};

/**
 * Converts an X.509v3 RSA certificate from an ASN.1 object.
 *
 * Note: If the certificate is to be verified then compute hash should
 * be set to true. There is currently no implementation for converting
 * a certificate back to ASN.1 so the TBSCertificate part of the ASN.1
 * object needs to be scanned before the cert object is created.
 *
 * @param obj the asn1 representation of an X.509v3 RSA certificate.
 * @param computeHash true to compute the hash for verification.
 *
 * @return the certificate.
 */
pki.certificateFromAsn1 = function(obj, computeHash) {
  // validate certificate and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, x509CertificateValidator, capture, errors)) {
    var error = new Error('Cannot read X.509 certificate. ' +
      'ASN.1 object is not an X509v3 Certificate.');
    error.errors = errors;
    throw error;
  }

  // get oid
  var oid = asn1.derToOid(capture.publicKeyOid);
  if(oid !== pki.oids.rsaEncryption) {
    throw new Error('Cannot read public key. OID is not RSA.');
  }

  // create certificate
  var cert = pki.createCertificate();
  cert.version = capture.certVersion ?
    capture.certVersion.charCodeAt(0) : 0;
  var serial = forge.util.createBuffer(capture.certSerialNumber);
  cert.serialNumber = serial.toHex();
  cert.signatureOid = forge.asn1.derToOid(capture.certSignatureOid);
  cert.signatureParameters = _readSignatureParameters(
    cert.signatureOid, capture.certSignatureParams, true);
  cert.siginfo.algorithmOid = forge.asn1.derToOid(capture.certinfoSignatureOid);
  cert.siginfo.parameters = _readSignatureParameters(cert.siginfo.algorithmOid,
    capture.certinfoSignatureParams, false);
  cert.signature = capture.certSignature;

  var validity = [];
  if(capture.certValidity1UTCTime !== undefined) {
    validity.push(asn1.utcTimeToDate(capture.certValidity1UTCTime));
  }
  if(capture.certValidity2GeneralizedTime !== undefined) {
    validity.push(asn1.generalizedTimeToDate(
      capture.certValidity2GeneralizedTime));
  }
  if(capture.certValidity3UTCTime !== undefined) {
    validity.push(asn1.utcTimeToDate(capture.certValidity3UTCTime));
  }
  if(capture.certValidity4GeneralizedTime !== undefined) {
    validity.push(asn1.generalizedTimeToDate(
      capture.certValidity4GeneralizedTime));
  }
  if(validity.length > 2) {
    throw new Error('Cannot read notBefore/notAfter validity times; more ' +
      'than two times were provided in the certificate.');
  }
  if(validity.length < 2) {
    throw new Error('Cannot read notBefore/notAfter validity times; they ' +
      'were not provided as either UTCTime or GeneralizedTime.');
  }
  cert.validity.notBefore = validity[0];
  cert.validity.notAfter = validity[1];

  // keep TBSCertificate to preserve signature when exporting
  cert.tbsCertificate = capture.tbsCertificate;

  if(computeHash) {
    // create digest for OID signature type
    cert.md = _createSignatureDigest({
      signatureOid: cert.signatureOid,
      type: 'certificate'
    });

    // produce DER formatted TBSCertificate and digest it
    var bytes = asn1.toDer(cert.tbsCertificate);
    cert.md.update(bytes.getBytes());
  }

  // handle issuer, build issuer message digest
  var imd = forge.md.sha1.create();
  var ibytes = asn1.toDer(capture.certIssuer);
  imd.update(ibytes.getBytes());
  cert.issuer.getField = function(sn) {
    return _getAttribute(cert.issuer, sn);
  };
  cert.issuer.addField = function(attr) {
    _fillMissingFields([attr]);
    cert.issuer.attributes.push(attr);
  };
  cert.issuer.attributes = pki.RDNAttributesAsArray(capture.certIssuer);
  if(capture.certIssuerUniqueId) {
    cert.issuer.uniqueId = capture.certIssuerUniqueId;
  }
  cert.issuer.hash = imd.digest().toHex();

  // handle subject, build subject message digest
  var smd = forge.md.sha1.create();
  var sbytes = asn1.toDer(capture.certSubject);
  smd.update(sbytes.getBytes());
  cert.subject.getField = function(sn) {
    return _getAttribute(cert.subject, sn);
  };
  cert.subject.addField = function(attr) {
    _fillMissingFields([attr]);
    cert.subject.attributes.push(attr);
  };
  cert.subject.attributes = pki.RDNAttributesAsArray(capture.certSubject);
  if(capture.certSubjectUniqueId) {
    cert.subject.uniqueId = capture.certSubjectUniqueId;
  }
  cert.subject.hash = smd.digest().toHex();

  // handle extensions
  if(capture.certExtensions) {
    cert.extensions = pki.certificateExtensionsFromAsn1(capture.certExtensions);
  } else {
    cert.extensions = [];
  }

  // convert RSA public key from ASN.1
  cert.publicKey = pki.publicKeyFromAsn1(capture.subjectPublicKeyInfo);

  return cert;
};

/**
 * Converts an ASN.1 extensions object (with extension sequences as its
 * values) into an array of extension objects with types and values.
 *
 * Supported extensions:
 *
 * id-ce-keyUsage OBJECT IDENTIFIER ::=  { id-ce 15 }
 * KeyUsage ::= BIT STRING {
 *   digitalSignature        (0),
 *   nonRepudiation          (1),
 *   keyEncipherment         (2),
 *   dataEncipherment        (3),
 *   keyAgreement            (4),
 *   keyCertSign             (5),
 *   cRLSign                 (6),
 *   encipherOnly            (7),
 *   decipherOnly            (8)
 * }
 *
 * id-ce-basicConstraints OBJECT IDENTIFIER ::=  { id-ce 19 }
 * BasicConstraints ::= SEQUENCE {
 *   cA                      BOOLEAN DEFAULT FALSE,
 *   pathLenConstraint       INTEGER (0..MAX) OPTIONAL
 * }
 *
 * subjectAltName EXTENSION ::= {
 *   SYNTAX GeneralNames
 *   IDENTIFIED BY id-ce-subjectAltName
 * }
 *
 * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
 *
 * GeneralName ::= CHOICE {
 *   otherName      [0] INSTANCE OF OTHER-NAME,
 *   rfc822Name     [1] IA5String,
 *   dNSName        [2] IA5String,
 *   x400Address    [3] ORAddress,
 *   directoryName  [4] Name,
 *   ediPartyName   [5] EDIPartyName,
 *   uniformResourceIdentifier [6] IA5String,
 *   IPAddress      [7] OCTET STRING,
 *   registeredID   [8] OBJECT IDENTIFIER
 * }
 *
 * OTHER-NAME ::= TYPE-IDENTIFIER
 *
 * EDIPartyName ::= SEQUENCE {
 *   nameAssigner [0] DirectoryString {ub-name} OPTIONAL,
 *   partyName    [1] DirectoryString {ub-name}
 * }
 *
 * @param exts the extensions ASN.1 with extension sequences to parse.
 *
 * @return the array.
 */
pki.certificateExtensionsFromAsn1 = function(exts) {
  var rval = [];
  for(var i = 0; i < exts.value.length; ++i) {
    // get extension sequence
    var extseq = exts.value[i];
    for(var ei = 0; ei < extseq.value.length; ++ei) {
      rval.push(pki.certificateExtensionFromAsn1(extseq.value[ei]));
    }
  }

  return rval;
};

/**
 * Parses a single certificate extension from ASN.1.
 *
 * @param ext the extension in ASN.1 format.
 *
 * @return the parsed extension as an object.
 */
pki.certificateExtensionFromAsn1 = function(ext) {
  // an extension has:
  // [0] extnID      OBJECT IDENTIFIER
  // [1] critical    BOOLEAN DEFAULT FALSE
  // [2] extnValue   OCTET STRING
  var e = {};
  e.id = asn1.derToOid(ext.value[0].value);
  e.critical = false;
  if(ext.value[1].type === asn1.Type.BOOLEAN) {
    e.critical = (ext.value[1].value.charCodeAt(0) !== 0x00);
    e.value = ext.value[2].value;
  } else {
    e.value = ext.value[1].value;
  }
  // if the oid is known, get its name
  if(e.id in oids) {
    e.name = oids[e.id];

    // handle key usage
    if(e.name === 'keyUsage') {
      // get value as BIT STRING
      var ev = asn1.fromDer(e.value);
      var b2 = 0x00;
      var b3 = 0x00;
      if(ev.value.length > 1) {
        // skip first byte, just indicates unused bits which
        // will be padded with 0s anyway
        // get bytes with flag bits
        b2 = ev.value.charCodeAt(1);
        b3 = ev.value.length > 2 ? ev.value.charCodeAt(2) : 0;
      }
      // set flags
      e.digitalSignature = (b2 & 0x80) === 0x80;
      e.nonRepudiation = (b2 & 0x40) === 0x40;
      e.keyEncipherment = (b2 & 0x20) === 0x20;
      e.dataEncipherment = (b2 & 0x10) === 0x10;
      e.keyAgreement = (b2 & 0x08) === 0x08;
      e.keyCertSign = (b2 & 0x04) === 0x04;
      e.cRLSign = (b2 & 0x02) === 0x02;
      e.encipherOnly = (b2 & 0x01) === 0x01;
      e.decipherOnly = (b3 & 0x80) === 0x80;
    } else if(e.name === 'basicConstraints') {
      // handle basic constraints
      // get value as SEQUENCE
      var ev = asn1.fromDer(e.value);
      // get cA BOOLEAN flag (defaults to false)
      if(ev.value.length > 0 && ev.value[0].type === asn1.Type.BOOLEAN) {
        e.cA = (ev.value[0].value.charCodeAt(0) !== 0x00);
      } else {
        e.cA = false;
      }
      // get path length constraint
      var value = null;
      if(ev.value.length > 0 && ev.value[0].type === asn1.Type.INTEGER) {
        value = ev.value[0].value;
      } else if(ev.value.length > 1) {
        value = ev.value[1].value;
      }
      if(value !== null) {
        e.pathLenConstraint = asn1.derToInteger(value);
      }
    } else if(e.name === 'extKeyUsage') {
      // handle extKeyUsage
      // value is a SEQUENCE of OIDs
      var ev = asn1.fromDer(e.value);
      for(var vi = 0; vi < ev.value.length; ++vi) {
        var oid = asn1.derToOid(ev.value[vi].value);
        if(oid in oids) {
          e[oids[oid]] = true;
        } else {
          e[oid] = true;
        }
      }
    } else if(e.name === 'nsCertType') {
      // handle nsCertType
      // get value as BIT STRING
      var ev = asn1.fromDer(e.value);
      var b2 = 0x00;
      if(ev.value.length > 1) {
        // skip first byte, just indicates unused bits which
        // will be padded with 0s anyway
        // get bytes with flag bits
        b2 = ev.value.charCodeAt(1);
      }
      // set flags
      e.client = (b2 & 0x80) === 0x80;
      e.server = (b2 & 0x40) === 0x40;
      e.email = (b2 & 0x20) === 0x20;
      e.objsign = (b2 & 0x10) === 0x10;
      e.reserved = (b2 & 0x08) === 0x08;
      e.sslCA = (b2 & 0x04) === 0x04;
      e.emailCA = (b2 & 0x02) === 0x02;
      e.objCA = (b2 & 0x01) === 0x01;
    } else if(
      e.name === 'subjectAltName' ||
      e.name === 'issuerAltName') {
      // handle subjectAltName/issuerAltName
      e.altNames = [];

      // ev is a SYNTAX SEQUENCE
      var gn;
      var ev = asn1.fromDer(e.value);
      for(var n = 0; n < ev.value.length; ++n) {
        // get GeneralName
        gn = ev.value[n];

        var altName = {
          type: gn.type,
          value: gn.value
        };
        e.altNames.push(altName);

        // Note: Support for types 1,2,6,7,8
        switch(gn.type) {
          // rfc822Name
          case 1:
          // dNSName
          case 2:
          // uniformResourceIdentifier (URI)
          case 6:
            break;
          // IPAddress
          case 7:
            // convert to IPv4/IPv6 string representation
            altName.ip = forge.util.bytesToIP(gn.value);
            break;
          // registeredID
          case 8:
            altName.oid = asn1.derToOid(gn.value);
            break;
          default:
            // unsupported
        }
      }
    } else if(e.name === 'subjectKeyIdentifier') {
      // value is an OCTETSTRING w/the hash of the key-type specific
      // public key structure (eg: RSAPublicKey)
      var ev = asn1.fromDer(e.value);
      e.subjectKeyIdentifier = forge.util.bytesToHex(ev.value);
    }
  }
  return e;
};

/**
 * Converts a PKCS#10 certification request (CSR) from an ASN.1 object.
 *
 * Note: If the certification request is to be verified then compute hash
 * should be set to true. There is currently no implementation for converting
 * a certificate back to ASN.1 so the CertificationRequestInfo part of the
 * ASN.1 object needs to be scanned before the csr object is created.
 *
 * @param obj the asn1 representation of a PKCS#10 certification request (CSR).
 * @param computeHash true to compute the hash for verification.
 *
 * @return the certification request (CSR).
 */
pki.certificationRequestFromAsn1 = function(obj, computeHash) {
  // validate certification request and capture data
  var capture = {};
  var errors = [];
  if(!asn1.validate(obj, certificationRequestValidator, capture, errors)) {
    var error = new Error('Cannot read PKCS#10 certificate request. ' +
      'ASN.1 object is not a PKCS#10 CertificationRequest.');
    error.errors = errors;
    throw error;
  }

  // get oid
  var oid = asn1.derToOid(capture.publicKeyOid);
  if(oid !== pki.oids.rsaEncryption) {
    throw new Error('Cannot read public key. OID is not RSA.');
  }

  // create certification request
  var csr = pki.createCertificationRequest();
  csr.version = capture.csrVersion ? capture.csrVersion.charCodeAt(0) : 0;
  csr.signatureOid = forge.asn1.derToOid(capture.csrSignatureOid);
  csr.signatureParameters = _readSignatureParameters(
    csr.signatureOid, capture.csrSignatureParams, true);
  csr.siginfo.algorithmOid = forge.asn1.derToOid(capture.csrSignatureOid);
  csr.siginfo.parameters = _readSignatureParameters(
    csr.siginfo.algorithmOid, capture.csrSignatureParams, false);
  csr.signature = capture.csrSignature;

  // keep CertificationRequestInfo to preserve signature when exporting
  csr.certificationRequestInfo = capture.certificationRequestInfo;

  if(computeHash) {
    // create digest for OID signature type
    csr.md = _createSignatureDigest({
      signatureOid: csr.signatureOid,
      type: 'certification request'
    });

    // produce DER formatted CertificationRequestInfo and digest it
    var bytes = asn1.toDer(csr.certificationRequestInfo);
    csr.md.update(bytes.getBytes());
  }

  // handle subject, build subject message digest
  var smd = forge.md.sha1.create();
  csr.subject.getField = function(sn) {
    return _getAttribute(csr.subject, sn);
  };
  csr.subject.addField = function(attr) {
    _fillMissingFields([attr]);
    csr.subject.attributes.push(attr);
  };
  csr.subject.attributes = pki.RDNAttributesAsArray(
    capture.certificationRequestInfoSubject, smd);
  csr.subject.hash = smd.digest().toHex();

  // convert RSA public key from ASN.1
  csr.publicKey = pki.publicKeyFromAsn1(capture.subjectPublicKeyInfo);

  // convert attributes from ASN.1
  csr.getAttribute = function(sn) {
    return _getAttribute(csr, sn);
  };
  csr.addAttribute = function(attr) {
    _fillMissingFields([attr]);
    csr.attributes.push(attr);
  };
  csr.attributes = pki.CRIAttributesAsArray(
    capture.certificationRequestInfoAttributes || []);

  return csr;
};

/**
 * Creates an empty certification request (a CSR or certificate signing
 * request). Once created, its public key and attributes can be set and then
 * it can be signed.
 *
 * @return the empty certification request.
 */
pki.createCertificationRequest = function() {
  var csr = {};
  csr.version = 0x00;
  csr.signatureOid = null;
  csr.signature = null;
  csr.siginfo = {};
  csr.siginfo.algorithmOid = null;

  csr.subject = {};
  csr.subject.getField = function(sn) {
    return _getAttribute(csr.subject, sn);
  };
  csr.subject.addField = function(attr) {
    _fillMissingFields([attr]);
    csr.subject.attributes.push(attr);
  };
  csr.subject.attributes = [];
  csr.subject.hash = null;

  csr.publicKey = null;
  csr.attributes = [];
  csr.getAttribute = function(sn) {
    return _getAttribute(csr, sn);
  };
  csr.addAttribute = function(attr) {
    _fillMissingFields([attr]);
    csr.attributes.push(attr);
  };
  csr.md = null;

  /**
   * Sets the subject of this certification request.
   *
   * @param attrs the array of subject attributes to use.
   */
  csr.setSubject = function(attrs) {
    // set new attributes
    _fillMissingFields(attrs);
    csr.subject.attributes = attrs;
    csr.subject.hash = null;
  };

  /**
   * Sets the attributes of this certification request.
   *
   * @param attrs the array of attributes to use.
   */
  csr.setAttributes = function(attrs) {
    // set new attributes
    _fillMissingFields(attrs);
    csr.attributes = attrs;
  };

  /**
   * Signs this certification request using the given private key.
   *
   * @param key the private key to sign with.
   * @param md the message digest object to use (defaults to forge.md.sha1).
   */
  csr.sign = function(key, md) {
    // TODO: get signature OID from private key
    csr.md = md || forge.md.sha1.create();
    var algorithmOid = oids[csr.md.algorithm + 'WithRSAEncryption'];
    if(!algorithmOid) {
      var error = new Error('Could not compute certification request digest. ' +
        'Unknown message digest algorithm OID.');
      error.algorithm = csr.md.algorithm;
      throw error;
    }
    csr.signatureOid = csr.siginfo.algorithmOid = algorithmOid;

    // get CertificationRequestInfo, convert to DER
    csr.certificationRequestInfo = pki.getCertificationRequestInfo(csr);
    var bytes = asn1.toDer(csr.certificationRequestInfo);

    // digest and sign
    csr.md.update(bytes.getBytes());
    csr.signature = key.sign(csr.md);
  };

  /**
   * Attempts verify the signature on the passed certification request using
   * its public key.
   *
   * A CSR that has been exported to a file in PEM format can be verified using
   * OpenSSL using this command:
   *
   * openssl req -in <the-csr-pem-file> -verify -noout -text
   *
   * @return true if verified, false if not.
   */
  csr.verify = function() {
    var rval = false;

    var md = csr.md;
    if(md === null) {
      md = _createSignatureDigest({
        signatureOid: csr.signatureOid,
        type: 'certification request'
      });

      // produce DER formatted CertificationRequestInfo and digest it
      var cri = csr.certificationRequestInfo ||
        pki.getCertificationRequestInfo(csr);
      var bytes = asn1.toDer(cri);
      md.update(bytes.getBytes());
    }

    if(md !== null) {
      rval = _verifySignature({
        certificate: csr, md: md, signature: csr.signature
      });
    }

    return rval;
  };

  return csr;
};

/**
 * Converts an X.509 subject or issuer to an ASN.1 RDNSequence.
 *
 * @param obj the subject or issuer (distinguished name).
 *
 * @return the ASN.1 RDNSequence.
 */
function _dnToAsn1(obj) {
  // create an empty RDNSequence
  var rval = asn1.create(
    asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

  // iterate over attributes
  var attr, set;
  var attrs = obj.attributes;
  for(var i = 0; i < attrs.length; ++i) {
    attr = attrs[i];
    var value = attr.value;

    // reuse tag class for attribute value if available
    var valueTagClass = asn1.Type.PRINTABLESTRING;
    if('valueTagClass' in attr) {
      valueTagClass = attr.valueTagClass;

      if(valueTagClass === asn1.Type.UTF8) {
        value = forge.util.encodeUtf8(value);
      }
      // FIXME: handle more encodings
    }

    // create a RelativeDistinguishedName set
    // each value in the set is an AttributeTypeAndValue first
    // containing the type (an OID) and second the value
    set = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // AttributeType
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(attr.type).getBytes()),
        // AttributeValue
        asn1.create(asn1.Class.UNIVERSAL, valueTagClass, false, value)
      ])
    ]);
    rval.value.push(set);
  }

  return rval;
}

/**
 * Gets all printable attributes (typically of an issuer or subject) in a
 * simplified JSON format for display.
 *
 * @param attrs the attributes.
 *
 * @return the JSON for display.
 */
function _getAttributesAsJson(attrs) {
  var rval = {};
  for(var i = 0; i < attrs.length; ++i) {
    var attr = attrs[i];
    if(attr.shortName && (
      attr.valueTagClass === asn1.Type.UTF8 ||
      attr.valueTagClass === asn1.Type.PRINTABLESTRING ||
      attr.valueTagClass === asn1.Type.IA5STRING)) {
      var value = attr.value;
      if(attr.valueTagClass === asn1.Type.UTF8) {
        value = forge.util.encodeUtf8(attr.value);
      }
      if(!(attr.shortName in rval)) {
        rval[attr.shortName] = value;
      } else if(forge.util.isArray(rval[attr.shortName])) {
        rval[attr.shortName].push(value);
      } else {
        rval[attr.shortName] = [rval[attr.shortName], value];
      }
    }
  }
  return rval;
}

/**
 * Fills in missing fields in attributes.
 *
 * @param attrs the attributes to fill missing fields in.
 */
function _fillMissingFields(attrs) {
  var attr;
  for(var i = 0; i < attrs.length; ++i) {
    attr = attrs[i];

    // populate missing name
    if(typeof attr.name === 'undefined') {
      if(attr.type && attr.type in pki.oids) {
        attr.name = pki.oids[attr.type];
      } else if(attr.shortName && attr.shortName in _shortNames) {
        attr.name = pki.oids[_shortNames[attr.shortName]];
      }
    }

    // populate missing type (OID)
    if(typeof attr.type === 'undefined') {
      if(attr.name && attr.name in pki.oids) {
        attr.type = pki.oids[attr.name];
      } else {
        var error = new Error('Attribute type not specified.');
        error.attribute = attr;
        throw error;
      }
    }

    // populate missing shortname
    if(typeof attr.shortName === 'undefined') {
      if(attr.name && attr.name in _shortNames) {
        attr.shortName = _shortNames[attr.name];
      }
    }

    // convert extensions to value
    if(attr.type === oids.extensionRequest) {
      attr.valueConstructed = true;
      attr.valueTagClass = asn1.Type.SEQUENCE;
      if(!attr.value && attr.extensions) {
        attr.value = [];
        for(var ei = 0; ei < attr.extensions.length; ++ei) {
          attr.value.push(pki.certificateExtensionToAsn1(
            _fillMissingExtensionFields(attr.extensions[ei])));
        }
      }
    }

    if(typeof attr.value === 'undefined') {
      var error = new Error('Attribute value not specified.');
      error.attribute = attr;
      throw error;
    }
  }
}

/**
 * Fills in missing fields in certificate extensions.
 *
 * @param e the extension.
 * @param [options] the options to use.
 *          [cert] the certificate the extensions are for.
 *
 * @return the extension.
 */
function _fillMissingExtensionFields(e, options) {
  options = options || {};

  // populate missing name
  if(typeof e.name === 'undefined') {
    if(e.id && e.id in pki.oids) {
      e.name = pki.oids[e.id];
    }
  }

  // populate missing id
  if(typeof e.id === 'undefined') {
    if(e.name && e.name in pki.oids) {
      e.id = pki.oids[e.name];
    } else {
      var error = new Error('Extension ID not specified.');
      error.extension = e;
      throw error;
    }
  }

  if(typeof e.value !== 'undefined') {
    return e;
  }

  // handle missing value:

  // value is a BIT STRING
  if(e.name === 'keyUsage') {
    // build flags
    var unused = 0;
    var b2 = 0x00;
    var b3 = 0x00;
    if(e.digitalSignature) {
      b2 |= 0x80;
      unused = 7;
    }
    if(e.nonRepudiation) {
      b2 |= 0x40;
      unused = 6;
    }
    if(e.keyEncipherment) {
      b2 |= 0x20;
      unused = 5;
    }
    if(e.dataEncipherment) {
      b2 |= 0x10;
      unused = 4;
    }
    if(e.keyAgreement) {
      b2 |= 0x08;
      unused = 3;
    }
    if(e.keyCertSign) {
      b2 |= 0x04;
      unused = 2;
    }
    if(e.cRLSign) {
      b2 |= 0x02;
      unused = 1;
    }
    if(e.encipherOnly) {
      b2 |= 0x01;
      unused = 0;
    }
    if(e.decipherOnly) {
      b3 |= 0x80;
      unused = 7;
    }

    // create bit string
    var value = String.fromCharCode(unused);
    if(b3 !== 0) {
      value += String.fromCharCode(b2) + String.fromCharCode(b3);
    } else if(b2 !== 0) {
      value += String.fromCharCode(b2);
    }
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false, value);
  } else if(e.name === 'basicConstraints') {
    // basicConstraints is a SEQUENCE
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    // cA BOOLEAN flag defaults to false
    if(e.cA) {
      e.value.value.push(asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false,
        String.fromCharCode(0xFF)));
    }
    if('pathLenConstraint' in e) {
      e.value.value.push(asn1.create(
        asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        asn1.integerToDer(e.pathLenConstraint).getBytes()));
    }
  } else if(e.name === 'extKeyUsage') {
    // extKeyUsage is a SEQUENCE of OIDs
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    var seq = e.value.value;
    for(var key in e) {
      if(e[key] !== true) {
        continue;
      }
      // key is name in OID map
      if(key in oids) {
        seq.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID,
          false, asn1.oidToDer(oids[key]).getBytes()));
      } else if(key.indexOf('.') !== -1) {
        // assume key is an OID
        seq.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID,
          false, asn1.oidToDer(key).getBytes()));
      }
    }
  } else if(e.name === 'nsCertType') {
    // nsCertType is a BIT STRING
    // build flags
    var unused = 0;
    var b2 = 0x00;

    if(e.client) {
      b2 |= 0x80;
      unused = 7;
    }
    if(e.server) {
      b2 |= 0x40;
      unused = 6;
    }
    if(e.email) {
      b2 |= 0x20;
      unused = 5;
    }
    if(e.objsign) {
      b2 |= 0x10;
      unused = 4;
    }
    if(e.reserved) {
      b2 |= 0x08;
      unused = 3;
    }
    if(e.sslCA) {
      b2 |= 0x04;
      unused = 2;
    }
    if(e.emailCA) {
      b2 |= 0x02;
      unused = 1;
    }
    if(e.objCA) {
      b2 |= 0x01;
      unused = 0;
    }

    // create bit string
    var value = String.fromCharCode(unused);
    if(b2 !== 0) {
      value += String.fromCharCode(b2);
    }
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false, value);
  } else if(e.name === 'subjectAltName' || e.name === 'issuerAltName') {
    // SYNTAX SEQUENCE
    e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

    var altName;
    for(var n = 0; n < e.altNames.length; ++n) {
      altName = e.altNames[n];
      var value = altName.value;
      // handle IP
      if(altName.type === 7 && altName.ip) {
        value = forge.util.bytesFromIP(altName.ip);
        if(value === null) {
          var error = new Error(
            'Extension "ip" value is not a valid IPv4 or IPv6 address.');
          error.extension = e;
          throw error;
        }
      } else if(altName.type === 8) {
        // handle OID
        if(altName.oid) {
          value = asn1.oidToDer(asn1.oidToDer(altName.oid));
        } else {
          // deprecated ... convert value to OID
          value = asn1.oidToDer(value);
        }
      }
      e.value.value.push(asn1.create(
        asn1.Class.CONTEXT_SPECIFIC, altName.type, false,
        value));
    }
  } else if(e.name === 'nsComment' && options.cert) {
    // sanity check value is ASCII (req'd) and not too big
    if(!(/^[\x00-\x7F]*$/.test(e.comment)) ||
      (e.comment.length < 1) || (e.comment.length > 128)) {
      throw new Error('Invalid "nsComment" content.');
    }
    // IA5STRING opaque comment
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.IA5STRING, false, e.comment);
  } else if(e.name === 'subjectKeyIdentifier' && options.cert) {
    var ski = options.cert.generateSubjectKeyIdentifier();
    e.subjectKeyIdentifier = ski.toHex();
    // OCTETSTRING w/digest
    e.value = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, ski.getBytes());
  } else if(e.name === 'authorityKeyIdentifier' && options.cert) {
    // SYNTAX SEQUENCE
    e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    var seq = e.value.value;

    if(e.keyIdentifier) {
      var keyIdentifier = (e.keyIdentifier === true ?
        options.cert.generateSubjectKeyIdentifier().getBytes() :
        e.keyIdentifier);
      seq.push(
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, false, keyIdentifier));
    }

    if(e.authorityCertIssuer) {
      var authorityCertIssuer = [
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 4, true, [
          _dnToAsn1(e.authorityCertIssuer === true ?
            options.cert.issuer : e.authorityCertIssuer)
        ])
      ];
      seq.push(
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, authorityCertIssuer));
    }

    if(e.serialNumber) {
      var serialNumber = forge.util.hexToBytes(e.serialNumber === true ?
        options.cert.serialNumber : e.serialNumber);
      seq.push(
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, false, serialNumber));
    }
  } else if(e.name === 'cRLDistributionPoints') {
    e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
    var seq = e.value.value;

    // Create sub SEQUENCE of DistributionPointName
    var subSeq = asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

    // Create fullName CHOICE
    var fullNameGeneralNames = asn1.create(
      asn1.Class.CONTEXT_SPECIFIC, 0, true, []);
    var altName;
    for(var n = 0; n < e.altNames.length; ++n) {
      altName = e.altNames[n];
      var value = altName.value;
      // handle IP
      if(altName.type === 7 && altName.ip) {
        value = forge.util.bytesFromIP(altName.ip);
        if(value === null) {
          var error = new Error(
            'Extension "ip" value is not a valid IPv4 or IPv6 address.');
          error.extension = e;
          throw error;
        }
      } else if(altName.type === 8) {
        // handle OID
        if(altName.oid) {
          value = asn1.oidToDer(asn1.oidToDer(altName.oid));
        } else {
          // deprecated ... convert value to OID
          value = asn1.oidToDer(value);
        }
      }
      fullNameGeneralNames.value.push(asn1.create(
        asn1.Class.CONTEXT_SPECIFIC, altName.type, false,
        value));
    }

    // Add to the parent SEQUENCE
    subSeq.value.push(asn1.create(
      asn1.Class.CONTEXT_SPECIFIC, 0, true, [fullNameGeneralNames]));
    seq.push(subSeq);
  }

  // ensure value has been defined by now
  if(typeof e.value === 'undefined') {
    var error = new Error('Extension value not specified.');
    error.extension = e;
    throw error;
  }

  return e;
}

/**
 * Convert signature parameters object to ASN.1
 *
 * @param {String} oid Signature algorithm OID
 * @param params The signature parameters object
 * @return ASN.1 object representing signature parameters
 */
function _signatureParametersToAsn1(oid, params) {
  switch(oid) {
    case oids['RSASSA-PSS']:
      var parts = [];

      if(params.hash.algorithmOid !== undefined) {
        parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
              asn1.oidToDer(params.hash.algorithmOid).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
          ])
        ]));
      }

      if(params.mgf.algorithmOid !== undefined) {
        parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
              asn1.oidToDer(params.mgf.algorithmOid).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                asn1.oidToDer(params.mgf.hash.algorithmOid).getBytes()),
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
            ])
          ])
        ]));
      }

      if(params.saltLength !== undefined) {
        parts.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(params.saltLength).getBytes())
        ]));
      }

      return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, parts);

    default:
      return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '');
  }
}

/**
 * Converts a certification request's attributes to an ASN.1 set of
 * CRIAttributes.
 *
 * @param csr certification request.
 *
 * @return the ASN.1 set of CRIAttributes.
 */
function _CRIAttributesToAsn1(csr) {
  // create an empty context-specific container
  var rval = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, []);

  // no attributes, return empty container
  if(csr.attributes.length === 0) {
    return rval;
  }

  // each attribute has a sequence with a type and a set of values
  var attrs = csr.attributes;
  for(var i = 0; i < attrs.length; ++i) {
    var attr = attrs[i];
    var value = attr.value;

    // reuse tag class for attribute value if available
    var valueTagClass = asn1.Type.UTF8;
    if('valueTagClass' in attr) {
      valueTagClass = attr.valueTagClass;
    }
    if(valueTagClass === asn1.Type.UTF8) {
      value = forge.util.encodeUtf8(value);
    }
    var valueConstructed = false;
    if('valueConstructed' in attr) {
      valueConstructed = attr.valueConstructed;
    }
    // FIXME: handle more encodings

    // create a RelativeDistinguishedName set
    // each value in the set is an AttributeTypeAndValue first
    // containing the type (an OID) and second the value
    var seq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // AttributeType
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(attr.type).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
        // AttributeValue
        asn1.create(
          asn1.Class.UNIVERSAL, valueTagClass, valueConstructed, value)
      ])
    ]);
    rval.value.push(seq);
  }

  return rval;
}

var jan_1_1950 = new Date('1950-01-01T00:00:00Z');
var jan_1_2050 = new Date('2050-01-01T00:00:00Z');

/**
 * Converts a Date object to ASN.1
 * Handles the different format before and after 1st January 2050
 *
 * @param date date object.
 *
 * @return the ASN.1 object representing the date.
 */
function _dateToAsn1(date) {
  if(date >= jan_1_1950 && date < jan_1_2050) {
    return asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, false,
      asn1.dateToUtcTime(date));
  } else {
    return asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.GENERALIZEDTIME, false,
      asn1.dateToGeneralizedTime(date));
  }
}

/**
 * Gets the ASN.1 TBSCertificate part of an X.509v3 certificate.
 *
 * @param cert the certificate.
 *
 * @return the asn1 TBSCertificate.
 */
pki.getTBSCertificate = function(cert) {
  // TBSCertificate
  var notBefore = _dateToAsn1(cert.validity.notBefore);
  var notAfter = _dateToAsn1(cert.validity.notAfter);
  var tbs = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version
    asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
      // integer
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        asn1.integerToDer(cert.version).getBytes())
    ]),
    // serialNumber
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      forge.util.hexToBytes(cert.serialNumber)),
    // signature
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(cert.siginfo.algorithmOid).getBytes()),
      // parameters
      _signatureParametersToAsn1(
        cert.siginfo.algorithmOid, cert.siginfo.parameters)
    ]),
    // issuer
    _dnToAsn1(cert.issuer),
    // validity
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      notBefore,
      notAfter
    ]),
    // subject
    _dnToAsn1(cert.subject),
    // SubjectPublicKeyInfo
    pki.publicKeyToAsn1(cert.publicKey)
  ]);

  if(cert.issuer.uniqueId) {
    // issuerUniqueID (optional)
    tbs.value.push(
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
          // TODO: support arbitrary bit length ids
          String.fromCharCode(0x00) +
          cert.issuer.uniqueId
        )
      ])
    );
  }
  if(cert.subject.uniqueId) {
    // subjectUniqueID (optional)
    tbs.value.push(
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
          // TODO: support arbitrary bit length ids
          String.fromCharCode(0x00) +
          cert.subject.uniqueId
        )
      ])
    );
  }

  if(cert.extensions.length > 0) {
    // extensions (optional)
    tbs.value.push(pki.certificateExtensionsToAsn1(cert.extensions));
  }

  return tbs;
};

/**
 * Gets the ASN.1 CertificationRequestInfo part of a
 * PKCS#10 CertificationRequest.
 *
 * @param csr the certification request.
 *
 * @return the asn1 CertificationRequestInfo.
 */
pki.getCertificationRequestInfo = function(csr) {
  // CertificationRequestInfo
  var cri = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      asn1.integerToDer(csr.version).getBytes()),
    // subject
    _dnToAsn1(csr.subject),
    // SubjectPublicKeyInfo
    pki.publicKeyToAsn1(csr.publicKey),
    // attributes
    _CRIAttributesToAsn1(csr)
  ]);

  return cri;
};

/**
 * Converts a DistinguishedName (subject or issuer) to an ASN.1 object.
 *
 * @param dn the DistinguishedName.
 *
 * @return the asn1 representation of a DistinguishedName.
 */
pki.distinguishedNameToAsn1 = function(dn) {
  return _dnToAsn1(dn);
};

/**
 * Converts an X.509v3 RSA certificate to an ASN.1 object.
 *
 * @param cert the certificate.
 *
 * @return the asn1 representation of an X.509v3 RSA certificate.
 */
pki.certificateToAsn1 = function(cert) {
  // prefer cached TBSCertificate over generating one
  var tbsCertificate = cert.tbsCertificate || pki.getTBSCertificate(cert);

  // Certificate
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // TBSCertificate
    tbsCertificate,
    // AlgorithmIdentifier (signature algorithm)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(cert.signatureOid).getBytes()),
      // parameters
      _signatureParametersToAsn1(cert.signatureOid, cert.signatureParameters)
    ]),
    // SignatureValue
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
      String.fromCharCode(0x00) + cert.signature)
  ]);
};

/**
 * Converts X.509v3 certificate extensions to ASN.1.
 *
 * @param exts the extensions to convert.
 *
 * @return the extensions in ASN.1 format.
 */
pki.certificateExtensionsToAsn1 = function(exts) {
  // create top-level extension container
  var rval = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 3, true, []);

  // create extension sequence (stores a sequence for each extension)
  var seq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);
  rval.value.push(seq);

  for(var i = 0; i < exts.length; ++i) {
    seq.value.push(pki.certificateExtensionToAsn1(exts[i]));
  }

  return rval;
};

/**
 * Converts a single certificate extension to ASN.1.
 *
 * @param ext the extension to convert.
 *
 * @return the extension in ASN.1 format.
 */
pki.certificateExtensionToAsn1 = function(ext) {
  // create a sequence for each extension
  var extseq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, []);

  // extnID (OID)
  extseq.value.push(asn1.create(
    asn1.Class.UNIVERSAL, asn1.Type.OID, false,
    asn1.oidToDer(ext.id).getBytes()));

  // critical defaults to false
  if(ext.critical) {
    // critical BOOLEAN DEFAULT FALSE
    extseq.value.push(asn1.create(
      asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false,
      String.fromCharCode(0xFF)));
  }

  var value = ext.value;
  if(typeof ext.value !== 'string') {
    // value is asn.1
    value = asn1.toDer(value).getBytes();
  }

  // extnValue (OCTET STRING)
  extseq.value.push(asn1.create(
    asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, value));

  return extseq;
};

/**
 * Converts a PKCS#10 certification request to an ASN.1 object.
 *
 * @param csr the certification request.
 *
 * @return the asn1 representation of a certification request.
 */
pki.certificationRequestToAsn1 = function(csr) {
  // prefer cached CertificationRequestInfo over generating one
  var cri = csr.certificationRequestInfo ||
    pki.getCertificationRequestInfo(csr);

  // Certificate
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // CertificationRequestInfo
    cri,
    // AlgorithmIdentifier (signature algorithm)
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // algorithm
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(csr.signatureOid).getBytes()),
      // parameters
      _signatureParametersToAsn1(csr.signatureOid, csr.signatureParameters)
    ]),
    // signature
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, false,
      String.fromCharCode(0x00) + csr.signature)
  ]);
};

/**
 * Creates a CA store.
 *
 * @param certs an optional array of certificate objects or PEM-formatted
 *          certificate strings to add to the CA store.
 *
 * @return the CA store.
 */
pki.createCaStore = function(certs) {
  // create CA store
  var caStore = {
    // stored certificates
    certs: {}
  };

  /**
   * Gets the certificate that issued the passed certificate or its
   * 'parent'.
   *
   * @param cert the certificate to get the parent for.
   *
   * @return the parent certificate or null if none was found.
   */
  caStore.getIssuer = function(cert) {
    var rval = getBySubject(cert.issuer);

    // see if there are multiple matches
    /*if(forge.util.isArray(rval)) {
      // TODO: resolve multiple matches by checking
      // authorityKey/subjectKey/issuerUniqueID/other identifiers, etc.
      // FIXME: or alternatively do authority key mapping
      // if possible (X.509v1 certs can't work?)
      throw new Error('Resolving multiple issuer matches not implemented yet.');
    }*/

    return rval;
  };

  /**
   * Adds a trusted certificate to the store.
   *
   * @param cert the certificate to add as a trusted certificate (either a
   *          pki.certificate object or a PEM-formatted certificate).
   */
  caStore.addCertificate = function(cert) {
    // convert from pem if necessary
    if(typeof cert === 'string') {
      cert = forge.pki.certificateFromPem(cert);
    }

    ensureSubjectHasHash(cert.subject);

    if(!caStore.hasCertificate(cert)) { // avoid duplicate certificates in store
      if(cert.subject.hash in caStore.certs) {
        // subject hash already exists, append to array
        var tmp = caStore.certs[cert.subject.hash];
        if(!forge.util.isArray(tmp)) {
          tmp = [tmp];
        }
        tmp.push(cert);
        caStore.certs[cert.subject.hash] = tmp;
      } else {
        caStore.certs[cert.subject.hash] = cert;
      }
    }
  };

  /**
   * Checks to see if the given certificate is in the store.
   *
   * @param cert the certificate to check (either a pki.certificate or a
   *          PEM-formatted certificate).
   *
   * @return true if the certificate is in the store, false if not.
   */
  caStore.hasCertificate = function(cert) {
    // convert from pem if necessary
    if(typeof cert === 'string') {
      cert = forge.pki.certificateFromPem(cert);
    }

    var match = getBySubject(cert.subject);
    if(!match) {
      return false;
    }
    if(!forge.util.isArray(match)) {
      match = [match];
    }
    // compare DER-encoding of certificates
    var der1 = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
    for(var i = 0; i < match.length; ++i) {
      var der2 = asn1.toDer(pki.certificateToAsn1(match[i])).getBytes();
      if(der1 === der2) {
        return true;
      }
    }
    return false;
  };

  /**
   * Lists all of the certificates kept in the store.
   *
   * @return an array of all of the pki.certificate objects in the store.
   */
  caStore.listAllCertificates = function() {
    var certList = [];

    for(var hash in caStore.certs) {
      if(caStore.certs.hasOwnProperty(hash)) {
        var value = caStore.certs[hash];
        if(!forge.util.isArray(value)) {
          certList.push(value);
        } else {
          for(var i = 0; i < value.length; ++i) {
            certList.push(value[i]);
          }
        }
      }
    }

    return certList;
  };

  /**
   * Removes a certificate from the store.
   *
   * @param cert the certificate to remove (either a pki.certificate or a
   *          PEM-formatted certificate).
   *
   * @return the certificate that was removed or null if the certificate
   *           wasn't in store.
   */
  caStore.removeCertificate = function(cert) {
    var result;

    // convert from pem if necessary
    if(typeof cert === 'string') {
      cert = forge.pki.certificateFromPem(cert);
    }
    ensureSubjectHasHash(cert.subject);
    if(!caStore.hasCertificate(cert)) {
      return null;
    }

    var match = getBySubject(cert.subject);

    if(!forge.util.isArray(match)) {
      result = caStore.certs[cert.subject.hash];
      delete caStore.certs[cert.subject.hash];
      return result;
    }

    // compare DER-encoding of certificates
    var der1 = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
    for(var i = 0; i < match.length; ++i) {
      var der2 = asn1.toDer(pki.certificateToAsn1(match[i])).getBytes();
      if(der1 === der2) {
        result = match[i];
        match.splice(i, 1);
      }
    }
    if(match.length === 0) {
      delete caStore.certs[cert.subject.hash];
    }

    return result;
  };

  function getBySubject(subject) {
    ensureSubjectHasHash(subject);
    return caStore.certs[subject.hash] || null;
  }

  function ensureSubjectHasHash(subject) {
    // produce subject hash if it doesn't exist
    if(!subject.hash) {
      var md = forge.md.sha1.create();
      subject.attributes = pki.RDNAttributesAsArray(_dnToAsn1(subject), md);
      subject.hash = md.digest().toHex();
    }
  }

  // auto-add passed in certs
  if(certs) {
    // parse PEM-formatted certificates as necessary
    for(var i = 0; i < certs.length; ++i) {
      var cert = certs[i];
      caStore.addCertificate(cert);
    }
  }

  return caStore;
};

/**
 * Certificate verification errors, based on TLS.
 */
pki.certificateError = {
  bad_certificate: 'forge.pki.BadCertificate',
  unsupported_certificate: 'forge.pki.UnsupportedCertificate',
  certificate_revoked: 'forge.pki.CertificateRevoked',
  certificate_expired: 'forge.pki.CertificateExpired',
  certificate_unknown: 'forge.pki.CertificateUnknown',
  unknown_ca: 'forge.pki.UnknownCertificateAuthority'
};

/**
 * Verifies a certificate chain against the given Certificate Authority store
 * with an optional custom verify callback.
 *
 * @param caStore a certificate store to verify against.
 * @param chain the certificate chain to verify, with the root or highest
 *          authority at the end (an array of certificates).
 * @param options a callback to be called for every certificate in the chain or
 *                  an object with:
 *                  verify a callback to be called for every certificate in the
 *                    chain
 *                  validityCheckDate the date against which the certificate
 *                    validity period should be checked. Pass null to not check
 *                    the validity period. By default, the current date is used.
 *
 * The verify callback has the following signature:
 *
 * verified - Set to true if certificate was verified, otherwise the
 *   pki.certificateError for why the certificate failed.
 * depth - The current index in the chain, where 0 is the end point's cert.
 * certs - The certificate chain, *NOTE* an empty chain indicates an anonymous
 *   end point.
 *
 * The function returns true on success and on failure either the appropriate
 * pki.certificateError or an object with 'error' set to the appropriate
 * pki.certificateError and 'message' set to a custom error message.
 *
 * @return true if successful, error thrown if not.
 */
pki.verifyCertificateChain = function(caStore, chain, options) {
  /* From: RFC3280 - Internet X.509 Public Key Infrastructure Certificate
    Section 6: Certification Path Validation
    See inline parentheticals related to this particular implementation.

    The primary goal of path validation is to verify the binding between
    a subject distinguished name or a subject alternative name and subject
    public key, as represented in the end entity certificate, based on the
    public key of the trust anchor. This requires obtaining a sequence of
    certificates that support that binding. That sequence should be provided
    in the passed 'chain'. The trust anchor should be in the given CA
    store. The 'end entity' certificate is the certificate provided by the
    end point (typically a server) and is the first in the chain.

    To meet this goal, the path validation process verifies, among other
    things, that a prospective certification path (a sequence of n
    certificates or a 'chain') satisfies the following conditions:

    (a) for all x in {1, ..., n-1}, the subject of certificate x is
          the issuer of certificate x+1;

    (b) certificate 1 is issued by the trust anchor;

    (c) certificate n is the certificate to be validated; and

    (d) for all x in {1, ..., n}, the certificate was valid at the
          time in question.

    Note that here 'n' is index 0 in the chain and 1 is the last certificate
    in the chain and it must be signed by a certificate in the connection's
    CA store.

    The path validation process also determines the set of certificate
    policies that are valid for this path, based on the certificate policies
    extension, policy mapping extension, policy constraints extension, and
    inhibit any-policy extension.

    Note: Policy mapping extension not supported (Not Required).

    Note: If the certificate has an unsupported critical extension, then it
    must be rejected.

    Note: A certificate is self-issued if the DNs that appear in the subject
    and issuer fields are identical and are not empty.

    The path validation algorithm assumes the following seven inputs are
    provided to the path processing logic. What this specific implementation
    will use is provided parenthetically:

    (a) a prospective certification path of length n (the 'chain')
    (b) the current date/time: ('now').
    (c) user-initial-policy-set: A set of certificate policy identifiers
          naming the policies that are acceptable to the certificate user.
          The user-initial-policy-set contains the special value any-policy
          if the user is not concerned about certificate policy
          (Not implemented. Any policy is accepted).
    (d) trust anchor information, describing a CA that serves as a trust
          anchor for the certification path. The trust anchor information
          includes:

      (1)  the trusted issuer name,
      (2)  the trusted public key algorithm,
      (3)  the trusted public key, and
      (4)  optionally, the trusted public key parameters associated
             with the public key.

      (Trust anchors are provided via certificates in the CA store).

      The trust anchor information may be provided to the path processing
      procedure in the form of a self-signed certificate. The trusted anchor
      information is trusted because it was delivered to the path processing
      procedure by some trustworthy out-of-band procedure. If the trusted
      public key algorithm requires parameters, then the parameters are
      provided along with the trusted public key (No parameters used in this
      implementation).

    (e) initial-policy-mapping-inhibit, which indicates if policy mapping is
          allowed in the certification path.
          (Not implemented, no policy checking)

    (f) initial-explicit-policy, which indicates if the path must be valid
          for at least one of the certificate policies in the user-initial-
          policy-set.
          (Not implemented, no policy checking)

    (g) initial-any-policy-inhibit, which indicates whether the
          anyPolicy OID should be processed if it is included in a
          certificate.
          (Not implemented, so any policy is valid provided that it is
          not marked as critical) */

  /* Basic Path Processing:

    For each certificate in the 'chain', the following is checked:

    1. The certificate validity period includes the current time.
    2. The certificate was signed by its parent (where the parent is either
       the next in the chain or from the CA store). Allow processing to
       continue to the next step if no parent is found but the certificate is
       in the CA store.
    3. TODO: The certificate has not been revoked.
    4. The certificate issuer name matches the parent's subject name.
    5. TODO: If the certificate is self-issued and not the final certificate
       in the chain, skip this step, otherwise verify that the subject name
       is within one of the permitted subtrees of X.500 distinguished names
       and that each of the alternative names in the subjectAltName extension
       (critical or non-critical) is within one of the permitted subtrees for
       that name type.
    6. TODO: If the certificate is self-issued and not the final certificate
       in the chain, skip this step, otherwise verify that the subject name
       is not within one of the excluded subtrees for X.500 distinguished
       names and none of the subjectAltName extension names are excluded for
       that name type.
    7. The other steps in the algorithm for basic path processing involve
       handling the policy extension which is not presently supported in this
       implementation. Instead, if a critical policy extension is found, the
       certificate is rejected as not supported.
    8. If the certificate is not the first or if its the only certificate in
       the chain (having no parent from the CA store or is self-signed) and it
       has a critical key usage extension, verify that the keyCertSign bit is
       set. If the key usage extension exists, verify that the basic
       constraints extension exists. If the basic constraints extension exists,
       verify that the cA flag is set. If pathLenConstraint is set, ensure that
       the number of certificates that precede in the chain (come earlier
       in the chain as implemented below), excluding the very first in the
       chain (typically the end-entity one), isn't greater than the
       pathLenConstraint. This constraint limits the number of intermediate
       CAs that may appear below a CA before only end-entity certificates
       may be issued. */

  // if a verify callback is passed as the third parameter, package it within
  // the options object. This is to support a legacy function signature that
  // expected the verify callback as the third parameter.
  if(typeof options === 'function') {
    options = {verify: options};
  }
  options = options || {};

  // copy cert chain references to another array to protect against changes
  // in verify callback
  chain = chain.slice(0);
  var certs = chain.slice(0);

  var validityCheckDate = options.validityCheckDate;
  // if no validityCheckDate is specified, default to the current date. Make
  // sure to maintain the value null because it indicates that the validity
  // period should not be checked.
  if(typeof validityCheckDate === 'undefined') {
    validityCheckDate = new Date();
  }

  // verify each cert in the chain using its parent, where the parent
  // is either the next in the chain or from the CA store
  var first = true;
  var error = null;
  var depth = 0;
  do {
    var cert = chain.shift();
    var parent = null;
    var selfSigned = false;

    if(validityCheckDate) {
      // 1. check valid time
      if(validityCheckDate < cert.validity.notBefore ||
         validityCheckDate > cert.validity.notAfter) {
        error = {
          message: 'Certificate is not valid yet or has expired.',
          error: pki.certificateError.certificate_expired,
          notBefore: cert.validity.notBefore,
          notAfter: cert.validity.notAfter,
          // TODO: we might want to reconsider renaming 'now' to
          // 'validityCheckDate' should this API be changed in the future.
          now: validityCheckDate
        };
      }
    }

    // 2. verify with parent from chain or CA store
    if(error === null) {
      parent = chain[0] || caStore.getIssuer(cert);
      if(parent === null) {
        // check for self-signed cert
        if(cert.isIssuer(cert)) {
          selfSigned = true;
          parent = cert;
        }
      }

      if(parent) {
        // FIXME: current CA store implementation might have multiple
        // certificates where the issuer can't be determined from the
        // certificate (happens rarely with, eg: old certificates) so normalize
        // by always putting parents into an array
        // TODO: there's may be an extreme degenerate case currently uncovered
        // where an old intermediate certificate seems to have a matching parent
        // but none of the parents actually verify ... but the intermediate
        // is in the CA and it should pass this check; needs investigation
        var parents = parent;
        if(!forge.util.isArray(parents)) {
          parents = [parents];
        }

        // try to verify with each possible parent (typically only one)
        var verified = false;
        while(!verified && parents.length > 0) {
          parent = parents.shift();
          try {
            verified = parent.verify(cert);
          } catch(ex) {
            // failure to verify, don't care why, try next one
          }
        }

        if(!verified) {
          error = {
            message: 'Certificate signature is invalid.',
            error: pki.certificateError.bad_certificate
          };
        }
      }

      if(error === null && (!parent || selfSigned) &&
        !caStore.hasCertificate(cert)) {
        // no parent issuer and certificate itself is not trusted
        error = {
          message: 'Certificate is not trusted.',
          error: pki.certificateError.unknown_ca
        };
      }
    }

    // TODO: 3. check revoked

    // 4. check for matching issuer/subject
    if(error === null && parent && !cert.isIssuer(parent)) {
      // parent is not issuer
      error = {
        message: 'Certificate issuer is invalid.',
        error: pki.certificateError.bad_certificate
      };
    }

    // 5. TODO: check names with permitted names tree

    // 6. TODO: check names against excluded names tree

    // 7. check for unsupported critical extensions
    if(error === null) {
      // supported extensions
      var se = {
        keyUsage: true,
        basicConstraints: true
      };
      for(var i = 0; error === null && i < cert.extensions.length; ++i) {
        var ext = cert.extensions[i];
        if(ext.critical && !(ext.name in se)) {
          error = {
            message:
              'Certificate has an unsupported critical extension.',
            error: pki.certificateError.unsupported_certificate
          };
        }
      }
    }

    // 8. check for CA if cert is not first or is the only certificate
    // remaining in chain with no parent or is self-signed
    if(error === null &&
      (!first || (chain.length === 0 && (!parent || selfSigned)))) {
      // first check keyUsage extension and then basic constraints
      var bcExt = cert.getExtension('basicConstraints');
      var keyUsageExt = cert.getExtension('keyUsage');
      if(keyUsageExt !== null) {
        // keyCertSign must be true and there must be a basic
        // constraints extension
        if(!keyUsageExt.keyCertSign || bcExt === null) {
          // bad certificate
          error = {
            message:
              'Certificate keyUsage or basicConstraints conflict ' +
              'or indicate that the certificate is not a CA. ' +
              'If the certificate is the only one in the chain or ' +
              'isn\'t the first then the certificate must be a ' +
              'valid CA.',
            error: pki.certificateError.bad_certificate
          };
        }
      }
      // basic constraints cA flag must be set
      if(error === null && bcExt !== null && !bcExt.cA) {
        // bad certificate
        error = {
          message:
            'Certificate basicConstraints indicates the certificate ' +
            'is not a CA.',
          error: pki.certificateError.bad_certificate
        };
      }
      // if error is not null and keyUsage is available, then we know it
      // has keyCertSign and there is a basic constraints extension too,
      // which means we can check pathLenConstraint (if it exists)
      if(error === null && keyUsageExt !== null &&
        'pathLenConstraint' in bcExt) {
        // pathLen is the maximum # of intermediate CA certs that can be
        // found between the current certificate and the end-entity (depth 0)
        // certificate; this number does not include the end-entity (depth 0,
        // last in the chain) even if it happens to be a CA certificate itself
        var pathLen = depth - 1;
        if(pathLen > bcExt.pathLenConstraint) {
          // pathLenConstraint violated, bad certificate
          error = {
            message:
              'Certificate basicConstraints pathLenConstraint violated.',
            error: pki.certificateError.bad_certificate
          };
        }
      }
    }

    // call application callback
    var vfd = (error === null) ? true : error.error;
    var ret = options.verify ? options.verify(vfd, depth, certs) : vfd;
    if(ret === true) {
      // clear any set error
      error = null;
    } else {
      // if passed basic tests, set default message and alert
      if(vfd === true) {
        error = {
          message: 'The application rejected the certificate.',
          error: pki.certificateError.bad_certificate
        };
      }

      // check for custom error info
      if(ret || ret === 0) {
        // set custom message and error
        if(typeof ret === 'object' && !forge.util.isArray(ret)) {
          if(ret.message) {
            error.message = ret.message;
          }
          if(ret.error) {
            error.error = ret.error;
          }
        } else if(typeof ret === 'string') {
          // set custom error
          error.error = ret;
        }
      }

      // throw error
      throw error;
    }

    // no longer first cert in chain
    first = false;
    ++depth;
  } while(chain.length > 0);

  return true;
};
