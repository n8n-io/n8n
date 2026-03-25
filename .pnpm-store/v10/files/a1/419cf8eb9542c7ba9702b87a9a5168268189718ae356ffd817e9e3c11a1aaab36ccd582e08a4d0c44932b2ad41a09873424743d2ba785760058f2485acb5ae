/**
 * Object IDs for ASN.1.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2013 Digital Bazaar, Inc.
 */
var forge = require('./forge');

forge.pki = forge.pki || {};
var oids = module.exports = forge.pki.oids = forge.oids = forge.oids || {};

// set id to name mapping and name to id mapping
function _IN(id, name) {
  oids[id] = name;
  oids[name] = id;
}
// set id to name mapping only
function _I_(id, name) {
  oids[id] = name;
}

// algorithm OIDs
_IN('1.2.840.113549.1.1.1', 'rsaEncryption');
// Note: md2 & md4 not implemented
//_IN('1.2.840.113549.1.1.2', 'md2WithRSAEncryption');
//_IN('1.2.840.113549.1.1.3', 'md4WithRSAEncryption');
_IN('1.2.840.113549.1.1.4', 'md5WithRSAEncryption');
_IN('1.2.840.113549.1.1.5', 'sha1WithRSAEncryption');
_IN('1.2.840.113549.1.1.7', 'RSAES-OAEP');
_IN('1.2.840.113549.1.1.8', 'mgf1');
_IN('1.2.840.113549.1.1.9', 'pSpecified');
_IN('1.2.840.113549.1.1.10', 'RSASSA-PSS');
_IN('1.2.840.113549.1.1.11', 'sha256WithRSAEncryption');
_IN('1.2.840.113549.1.1.12', 'sha384WithRSAEncryption');
_IN('1.2.840.113549.1.1.13', 'sha512WithRSAEncryption');
// Edwards-curve Digital Signature Algorithm (EdDSA) Ed25519
_IN('1.3.101.112', 'EdDSA25519');

_IN('1.2.840.10040.4.3', 'dsa-with-sha1');

_IN('1.3.14.3.2.7', 'desCBC');

_IN('1.3.14.3.2.26', 'sha1');
// Deprecated equivalent of sha1WithRSAEncryption
_IN('1.3.14.3.2.29', 'sha1WithRSASignature');
_IN('2.16.840.1.101.3.4.2.1', 'sha256');
_IN('2.16.840.1.101.3.4.2.2', 'sha384');
_IN('2.16.840.1.101.3.4.2.3', 'sha512');
_IN('2.16.840.1.101.3.4.2.4', 'sha224');
_IN('2.16.840.1.101.3.4.2.5', 'sha512-224');
_IN('2.16.840.1.101.3.4.2.6', 'sha512-256');
_IN('1.2.840.113549.2.2', 'md2');
_IN('1.2.840.113549.2.5', 'md5');

// pkcs#7 content types
_IN('1.2.840.113549.1.7.1', 'data');
_IN('1.2.840.113549.1.7.2', 'signedData');
_IN('1.2.840.113549.1.7.3', 'envelopedData');
_IN('1.2.840.113549.1.7.4', 'signedAndEnvelopedData');
_IN('1.2.840.113549.1.7.5', 'digestedData');
_IN('1.2.840.113549.1.7.6', 'encryptedData');

// pkcs#9 oids
_IN('1.2.840.113549.1.9.1', 'emailAddress');
_IN('1.2.840.113549.1.9.2', 'unstructuredName');
_IN('1.2.840.113549.1.9.3', 'contentType');
_IN('1.2.840.113549.1.9.4', 'messageDigest');
_IN('1.2.840.113549.1.9.5', 'signingTime');
_IN('1.2.840.113549.1.9.6', 'counterSignature');
_IN('1.2.840.113549.1.9.7', 'challengePassword');
_IN('1.2.840.113549.1.9.8', 'unstructuredAddress');
_IN('1.2.840.113549.1.9.14', 'extensionRequest');

_IN('1.2.840.113549.1.9.20', 'friendlyName');
_IN('1.2.840.113549.1.9.21', 'localKeyId');
_IN('1.2.840.113549.1.9.22.1', 'x509Certificate');

// pkcs#12 safe bags
_IN('1.2.840.113549.1.12.10.1.1', 'keyBag');
_IN('1.2.840.113549.1.12.10.1.2', 'pkcs8ShroudedKeyBag');
_IN('1.2.840.113549.1.12.10.1.3', 'certBag');
_IN('1.2.840.113549.1.12.10.1.4', 'crlBag');
_IN('1.2.840.113549.1.12.10.1.5', 'secretBag');
_IN('1.2.840.113549.1.12.10.1.6', 'safeContentsBag');

// password-based-encryption for pkcs#12
_IN('1.2.840.113549.1.5.13', 'pkcs5PBES2');
_IN('1.2.840.113549.1.5.12', 'pkcs5PBKDF2');

_IN('1.2.840.113549.1.12.1.1', 'pbeWithSHAAnd128BitRC4');
_IN('1.2.840.113549.1.12.1.2', 'pbeWithSHAAnd40BitRC4');
_IN('1.2.840.113549.1.12.1.3', 'pbeWithSHAAnd3-KeyTripleDES-CBC');
_IN('1.2.840.113549.1.12.1.4', 'pbeWithSHAAnd2-KeyTripleDES-CBC');
_IN('1.2.840.113549.1.12.1.5', 'pbeWithSHAAnd128BitRC2-CBC');
_IN('1.2.840.113549.1.12.1.6', 'pbewithSHAAnd40BitRC2-CBC');

// hmac OIDs
_IN('1.2.840.113549.2.7', 'hmacWithSHA1');
_IN('1.2.840.113549.2.8', 'hmacWithSHA224');
_IN('1.2.840.113549.2.9', 'hmacWithSHA256');
_IN('1.2.840.113549.2.10', 'hmacWithSHA384');
_IN('1.2.840.113549.2.11', 'hmacWithSHA512');

// symmetric key algorithm oids
_IN('1.2.840.113549.3.7', 'des-EDE3-CBC');
_IN('2.16.840.1.101.3.4.1.2', 'aes128-CBC');
_IN('2.16.840.1.101.3.4.1.22', 'aes192-CBC');
_IN('2.16.840.1.101.3.4.1.42', 'aes256-CBC');

// certificate issuer/subject OIDs
_IN('2.5.4.3', 'commonName');
_IN('2.5.4.4', 'surname');
_IN('2.5.4.5', 'serialNumber');
_IN('2.5.4.6', 'countryName');
_IN('2.5.4.7', 'localityName');
_IN('2.5.4.8', 'stateOrProvinceName');
_IN('2.5.4.9', 'streetAddress');
_IN('2.5.4.10', 'organizationName');
_IN('2.5.4.11', 'organizationalUnitName');
_IN('2.5.4.12', 'title');
_IN('2.5.4.13', 'description');
_IN('2.5.4.15', 'businessCategory');
_IN('2.5.4.17', 'postalCode');
_IN('2.5.4.42', 'givenName');
_IN('1.3.6.1.4.1.311.60.2.1.2', 'jurisdictionOfIncorporationStateOrProvinceName');
_IN('1.3.6.1.4.1.311.60.2.1.3', 'jurisdictionOfIncorporationCountryName');

// X.509 extension OIDs
_IN('2.16.840.1.113730.1.1', 'nsCertType');
_IN('2.16.840.1.113730.1.13', 'nsComment'); // deprecated in theory; still widely used
_I_('2.5.29.1', 'authorityKeyIdentifier'); // deprecated, use .35
_I_('2.5.29.2', 'keyAttributes'); // obsolete use .37 or .15
_I_('2.5.29.3', 'certificatePolicies'); // deprecated, use .32
_I_('2.5.29.4', 'keyUsageRestriction'); // obsolete use .37 or .15
_I_('2.5.29.5', 'policyMapping'); // deprecated use .33
_I_('2.5.29.6', 'subtreesConstraint'); // obsolete use .30
_I_('2.5.29.7', 'subjectAltName'); // deprecated use .17
_I_('2.5.29.8', 'issuerAltName'); // deprecated use .18
_I_('2.5.29.9', 'subjectDirectoryAttributes');
_I_('2.5.29.10', 'basicConstraints'); // deprecated use .19
_I_('2.5.29.11', 'nameConstraints'); // deprecated use .30
_I_('2.5.29.12', 'policyConstraints'); // deprecated use .36
_I_('2.5.29.13', 'basicConstraints'); // deprecated use .19
_IN('2.5.29.14', 'subjectKeyIdentifier');
_IN('2.5.29.15', 'keyUsage');
_I_('2.5.29.16', 'privateKeyUsagePeriod');
_IN('2.5.29.17', 'subjectAltName');
_IN('2.5.29.18', 'issuerAltName');
_IN('2.5.29.19', 'basicConstraints');
_I_('2.5.29.20', 'cRLNumber');
_I_('2.5.29.21', 'cRLReason');
_I_('2.5.29.22', 'expirationDate');
_I_('2.5.29.23', 'instructionCode');
_I_('2.5.29.24', 'invalidityDate');
_I_('2.5.29.25', 'cRLDistributionPoints'); // deprecated use .31
_I_('2.5.29.26', 'issuingDistributionPoint'); // deprecated use .28
_I_('2.5.29.27', 'deltaCRLIndicator');
_I_('2.5.29.28', 'issuingDistributionPoint');
_I_('2.5.29.29', 'certificateIssuer');
_I_('2.5.29.30', 'nameConstraints');
_IN('2.5.29.31', 'cRLDistributionPoints');
_IN('2.5.29.32', 'certificatePolicies');
_I_('2.5.29.33', 'policyMappings');
_I_('2.5.29.34', 'policyConstraints'); // deprecated use .36
_IN('2.5.29.35', 'authorityKeyIdentifier');
_I_('2.5.29.36', 'policyConstraints');
_IN('2.5.29.37', 'extKeyUsage');
_I_('2.5.29.46', 'freshestCRL');
_I_('2.5.29.54', 'inhibitAnyPolicy');

// extKeyUsage purposes
_IN('1.3.6.1.4.1.11129.2.4.2', 'timestampList');
_IN('1.3.6.1.5.5.7.1.1', 'authorityInfoAccess');
_IN('1.3.6.1.5.5.7.3.1', 'serverAuth');
_IN('1.3.6.1.5.5.7.3.2', 'clientAuth');
_IN('1.3.6.1.5.5.7.3.3', 'codeSigning');
_IN('1.3.6.1.5.5.7.3.4', 'emailProtection');
_IN('1.3.6.1.5.5.7.3.8', 'timeStamping');
