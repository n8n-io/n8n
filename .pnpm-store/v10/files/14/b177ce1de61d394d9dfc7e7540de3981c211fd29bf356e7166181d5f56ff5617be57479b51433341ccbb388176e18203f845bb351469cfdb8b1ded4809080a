[![Build Status](https://travis-ci.org/auth0/node-xml-encryption.png)](https://travis-ci.org/auth0/node-xml-encryption)

W3C XML Encryption implementation for node.js (http://www.w3.org/TR/xmlenc-core/)

Supports node >= 12

## Usage

    npm install xml-encryption

### encrypt

~~~js
var xmlenc = require('xml-encryption');

var options = {
  rsa_pub: fs.readFileSync(__dirname + '/your_rsa.pub'),
  pem: fs.readFileSync(__dirname + '/your_public_cert.pem'),
  encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
  keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p',
  disallowEncryptionWithInsecureAlgorithm: true,
  warnInsecureAlgorithm: true
};

xmlenc.encrypt('content to encrypt', options, function(err, result) {
    console.log(result);
}
~~~

Result:
~~~xml
<xenc:EncryptedData Type="http://www.w3.org/2001/04/xmlenc#Element" xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">
  <xenc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes-256-cbc" />
    <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
      <e:EncryptedKey xmlns:e="http://www.w3.org/2001/04/xmlenc#">
        <e:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p">
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />
        </e:EncryptionMethod>
        <KeyInfo>
          <X509Data><X509Certificate>MIIEDzCCAveg... base64 cert... q3uaLvlAUo=</X509Certificate></X509Data>
        </KeyInfo>
        <e:CipherData>
          <e:CipherValue>sGH0hhzkjmLWYYY0gyQMampDM... encrypted symmetric key ...gewHMbtZafk1MHh9A==</e:CipherValue>
        </e:CipherData>
      </e:EncryptedKey>
    </KeyInfo>
    <xenc:CipherData>
        <xenc:CipherValue>V3Vb1vDl055Lp92zvK..... encrypted content.... kNzP6xTu7/L9EMAeU</xenc:CipherValue>
    </xenc:CipherData>
</xenc:EncryptedData>
~~~

### decrypt

~~~js
var options = {
    key: fs.readFileSync(__dirname + '/your_private_key.key'),
    disallowDecryptionWithInsecureAlgorithm: true,
    warnInsecureAlgorithm: true
};

xmlenc.decrypt('<xenc:EncryptedData ..... </xenc:EncryptedData>', options, function(err, result) {
    console.log(result);
}

// result

decrypted content
~~~

## Supported algorithms

Currently the library supports:

* EncryptedKey to transport symmetric key using:
  * http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p
  * http://www.w3.org/2001/04/xmlenc#rsa-1_5 (Insecure Algorithm)

* EncryptedData using:
  * http://www.w3.org/2001/04/xmlenc#aes128-cbc
  * http://www.w3.org/2001/04/xmlenc#aes256-cbc
  * http://www.w3.org/2009/xmlenc11#aes128-gcm
  * http://www.w3.org/2009/xmlenc11#aes256-gcm
  * http://www.w3.org/2001/04/xmlenc#tripledes-cbc (Insecure Algorithm)

Insecure Algorithms can be disabled via `disallowEncryptionWithInsecureAlgorithm`/`disallowDecryptionWithInsecureAlgorithm` flags when encrypting/decrypting. This flag is off by default in 0.x versions.

A warning will be piped to `stderr` using console.warn() by default when the aforementioned algorithms are used. This can be disabled via the `warnInsecureAlgorithm` flag.

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.

## Releases
Release notes may be found under github release page: https://github.com/auth0/node-xml-encryption/releases
