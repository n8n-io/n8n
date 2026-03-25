# xml-crypto

![Build](https://github.com/node-saml/xml-crypto/actions/workflows/ci.yml/badge.svg)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/from-referrer/)

---

# Upgrading

The `.getReferences()` AND the `.references` APIs are deprecated.
Please do not attempt to access them. The content in them should be treated as unsigned.

Instead, we strongly encourage users to migrate to the `.getSignedReferences()` API. See the [Verifying XML document](#verifying-xml-documents) section
We understand that this may take a lot of efforts to migrate, feel free to ask for help.
This will help prevent future XML signature wrapping attacks.

---

## Install

Install with [npm](http://github.com/isaacs/npm):

```shell
npm install xml-crypto
```

A pre requisite it to have [openssl](http://www.openssl.org/) installed and its /bin to be on the system path. I used version 1.0.1c but it should work on older versions too.

## Supported Algorithms

### Canonicalization and Transformation Algorithms

- Canonicalization <http://www.w3.org/TR/2001/REC-xml-c14n-20010315>
- Canonicalization with comments <http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments>
- Exclusive Canonicalization <http://www.w3.org/2001/10/xml-exc-c14n#>
- Exclusive Canonicalization with comments <http://www.w3.org/2001/10/xml-exc-c14n#WithComments>
- Enveloped Signature transform <http://www.w3.org/2000/09/xmldsig#enveloped-signature>

### Hashing Algorithms

- SHA1 digests <http://www.w3.org/2000/09/xmldsig#sha1>
- SHA256 digests <http://www.w3.org/2001/04/xmlenc#sha256>
- SHA512 digests <http://www.w3.org/2001/04/xmlenc#sha512>

### Signature Algorithms

- RSA-SHA1 <http://www.w3.org/2000/09/xmldsig#rsa-sha1>
- RSA-SHA256 <http://www.w3.org/2001/04/xmldsig-more#rsa-sha256>
- RSA-SHA512 <http://www.w3.org/2001/04/xmldsig-more#rsa-sha512>

HMAC-SHA1 is also available but it is disabled by default

- HMAC-SHA1 <http://www.w3.org/2000/09/xmldsig#hmac-sha1>

to enable HMAC-SHA1, call `enableHMAC()` on your instance of `SignedXml`.

This will enable HMAC and disable digital signature algorithms. Due to key
confusion issues, it is risky to have both HMAC-based and public key digital
signature algorithms enabled at same time.

[You are able to extend xml-crypto with custom algorithms.](#customizing-algorithms)

## Signing Xml documents

When signing a xml document you can pass the following options to the `SignedXml` constructor to customize the signature process:

- `privateKey` - **[required]** a `Buffer` or pem encoded `String` containing your private key
- `publicCert` - **[optional]** a `Buffer` or pem encoded `String` containing your public key
- `signatureAlgorithm` - **[required]** one of the supported [signature algorithms](#signature-algorithms). Ex: `sign.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"`
- `canonicalizationAlgorithm` - **[required]** one of the supported [canonicalization algorithms](#canonicalization-and-transformation-algorithms). Ex: `sign.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#WithComments"`

Use this code:

```javascript
var SignedXml = require("xml-crypto").SignedXml,
  fs = require("fs");

var xml = "<library>" + "<book>" + "<name>Harry Potter</name>" + "</book>" + "</library>";

var sig = new SignedXml({ privateKey: fs.readFileSync("client.pem") });
sig.addReference({
  xpath: "//*[local-name(.)='book']",
  digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  transforms: ["http://www.w3.org/2001/10/xml-exc-c14n#"],
});
sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
sig.computeSignature(xml);
fs.writeFileSync("signed.xml", sig.getSignedXml());
```

The result will be:

```xml
<library>
  <book Id="_0">
    <name>Harry Potter</name>
  </book>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1" />
      <Reference URI="#_0">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />
        <DigestValue>cdiS43aFDQMnb3X8yaIUej3+z9Q=</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>vhWzpQyIYuncHUZV9W...[long base64 removed]...</SignatureValue>
  </Signature>
</library>
```

Note:

If you set the `publicCert` and the `getKeyInfoContent` properties, a `<KeyInfo></KeyInfo>` element with the public certificate will be generated in the signature:

```xml
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    ...[signature info removed]...
  </SignedInfo>
  <SignatureValue>vhWzpQyIYuncHUZV9W...[long base64 removed]...</SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>MIIGYjCCBJagACCBN...[long base64 removed]...</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>
```

For `getKeyInfoContent`, a default implementation `SignedXml.getKeyInfoContent` is available.

To customize this see [customizing algorithms](#customizing-algorithms) for an example.

## Verifying Xml documents

When verifying a xml document you can pass the following options to the `SignedXml` constructor to customize the verify process:

- `publicCert` - **[optional]** your certificate as a string, a string of multiple certs in PEM format, or a Buffer
- `privateKey` - **[optional]** your private key as a string or a Buffer - used for verifying symmetrical signatures (HMAC)

The certificate that will be used to check the signature will first be determined by calling `this.getCertFromKeyInfo()`, which function you can customize as you see fit. If that returns `null`, then `publicCert` is used. If that is `null`, then `privateKey` is used (for symmetrical signing applications).

Example:

```javascript
new SignedXml({
  publicCert: client_public_pem,
  getCertFromKeyInfo: () => null,
});
```

You can use any dom parser you want in your code (or none, depending on your usage). This sample uses [xmldom](https://github.com/xmldom/xmldom), so you should install it first:

```shell
npm install @xmldom/xmldom
```

Example:

```javascript
var select = require("xml-crypto").xpath,
  dom = require("@xmldom/xmldom").DOMParser,
  SignedXml = require("xml-crypto").SignedXml,
  fs = require("fs");

var xml = fs.readFileSync("signed.xml").toString();
var doc = new dom().parseFromString(xml);

// DO NOT attempt to parse whatever data object you have here in `doc`
// and then use it to verify the signature. This can lead to security issues.
// i.e. BAD: parseAssertion(doc),
// good: see below

var signature = select(
  doc,
  "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']",
)[0];
var sig = new SignedXml({ publicCert: fs.readFileSync("client_public.pem") });
sig.loadSignature(signature);
try {
  var res = sig.checkSignature(xml);
} catch (ex) {
  console.log(ex);
}
```

In order to protect from some attacks we must check the content we want to use is the one that has been signed:

```javascript
if (!res) {
  throw "Invalid Signature";
}
// good: The XML Signature has been verified, meaning some subset of XML is verified.
var signedBytes = sig.getSignedReferences();

var authenticatedDoc = new dom().parseFromString(signedBytes[0]); // Take the first signed reference
// It is now safe to load SAML, obtain the assertion XML, or do whatever else is needed.
// Be sure to only use authenticated data.
let signedAssertionNode = extractAssertion(authenticatedDoc);
let parsedAssertion = parseAssertion(signedAssertionNode);

return parsedAssertion; // This the correctly verified signed Assertion

// BAD example: DO not use the .getReferences() API.
```

Note:

The xml-crypto api requires you to supply it separately the xml signature ("&lt;Signature&gt;...&lt;/Signature&gt;", in loadSignature) and the signed xml (in checkSignature). The signed xml may or may not contain the signature in it, but you are still required to supply the signature separately.

### Caring for Implicit transform

If you fail to verify signed XML, then one possible cause is that there are some hidden implicit transforms(#).  
(#) Normalizing XML document to be verified. i.e. remove extra space within a tag, sorting attributes, importing namespace declared in ancestor nodes, etc.

The reason for these implicit transform might come from [complex xml signature specification](https://www.w3.org/TR/2002/REC-xmldsig-core-20020212),
which makes XML developers confused and then leads to incorrect implementation for signing XML document.

If you keep failing verification, it is worth trying to guess such a hidden transform and specify it to the option as below:

```javascript
var options = {
  implicitTransforms: ["http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
  publicCert: fs.readFileSync("client_public.pem"),
};
var sig = new SignedXml(options);
sig.loadSignature(signature);
var res = sig.checkSignature(xml);
```

You might find it difficult to guess such transforms, but there are typical transforms you can try.

- <http://www.w3.org/TR/2001/REC-xml-c14n-20010315>
- <http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments>
- <http://www.w3.org/2001/10/xml-exc-c14n#>
- <http://www.w3.org/2001/10/xml-exc-c14n#WithComments>

## API

### xpath

See [xpath.js](https://github.com/yaronn/xpath.js) for usage. Note that this is actually using
[another library](https://github.com/goto100/xpath) as the underlying implementation.

### SignedXml

The `SignedXml` constructor provides an abstraction for sign and verify xml documents. The object is constructed using `new SignedXml(options?: SignedXmlOptions)` where the possible options are:

- `idMode` - default `null` - if the value of `wssecurity` is passed it will create/validate id's with the ws-security namespace.
- `idAttribute` - string - default `Id` or `ID` or `id` - the name of the attribute that contains the id of the element
- `privateKey` - string or Buffer - default `null` - the private key to use for signing
- `publicCert` - string or Buffer - default `null` - the public certificate to use for verifying
- `signatureAlgorithm` - string - the signature algorithm to use
- `canonicalizationAlgorithm` - string - default `undefined` - the canonicalization algorithm to use
- `inclusiveNamespacesPrefixList` - string - default `null` - a list of namespace prefixes to include during canonicalization
- `implicitTransforms` - string[] - default `[]` - a list of implicit transforms to use during verification
- `keyInfoAttributes` - object - default `{}` - a hash of attributes and values `attrName: value` to add to the KeyInfo node
- `getKeyInfoContent` - function - default `noop` - a function that returns the content of the KeyInfo node
- `getCertFromKeyInfo` - function - default `SignedXml.getCertFromKeyInfo` - a function that returns the certificate from the `<KeyInfo />` node

#### API

A `SignedXml` object provides the following methods:

To sign xml documents:

- `addReference(xpath, transforms, digestAlgorithm)` - adds a reference to a xml element where:
  - `xpath` - a string containing a XPath expression referencing a xml element
  - `transforms` - an array of [transform algorithms](#canonicalization-and-transformation-algorithms), the referenced element will be transformed for each value in the array
  - `digestAlgorithm` - one of the supported [hashing algorithms](#hashing-algorithms)
- `computeSignature(xml, [options])` - compute the signature of the given xml where:
  - `xml` - a string containing a xml document
  - `options` - an object with the following properties:
    - `prefix` - adds this value as a prefix for the generated signature tags
    - `attrs` - a hash of attributes and values `attrName: value` to add to the signature root node
    - `location` - customize the location of the signature, pass an object with a `reference` key which should contain a XPath expression to a reference node, an `action` key which should contain one of the following values: `append`, `prepend`, `before`, `after`
    - `existingPrefixes` - A hash of prefixes and namespaces `prefix: namespace` that shouldn't be in the signature because they already exist in the xml
- `getSignedXml()` - returns the original xml document with the signature in it, **must be called only after `computeSignature`**
- `getSignatureXml()` - returns just the signature part, **must be called only after `computeSignature`**
- `getOriginalXmlWithIds()` - returns the original xml with Id attributes added on relevant elements (required for validation), **must be called only after `computeSignature`**

To verify xml documents:

- `loadSignature(signatureXml)` - loads the signature where:
  - `signatureXml` - a string or node object (like an [xmldom](https://github.com/xmldom/xmldom) node) containing the xml representation of the signature
- `checkSignature(xml)` - validates the given xml document and returns `true` if the validation was successful

## Customizing Algorithms

The following sample shows how to sign a message using custom algorithms.

First import some modules:

```javascript
var SignedXml = require("xml-crypto").SignedXml,
  fs = require("fs");
```

Now define the extension point you want to implement. You can choose one or more.

To determine the inclusion and contents of a `<KeyInfo />` element, the function
`this.getKeyInfoContent()` is called. There is a default implementation of this. If you wish to change
this implementation, provide your own function assigned to the property `this.getKeyInfoContent`. If you prefer to use the default implementation, assign `SignedXml.getKeyInfoContent` to `this.getKeyInfoContent` If
there are no attributes and no contents to the `<KeyInfo />` element, it won't be included in the
generated XML.

To specify custom attributes on `<KeyInfo />`, add the properties to the `.keyInfoAttributes` property.

A custom hash algorithm is used to calculate digests. Implement it if you want a hash other than the built-in methods.

```javascript
function MyDigest() {
  this.getHash = function (xml) {
    return "the base64 hash representation of the given xml string";
  };

  this.getAlgorithmName = function () {
    return "http://myDigestAlgorithm";
  };
}
```

A custom signing algorithm.

```javascript
function MySignatureAlgorithm() {
  /*sign the given SignedInfo using the key. return base64 signature value*/
  this.getSignature = function (signedInfo, privateKey) {
    return "signature of signedInfo as base64...";
  };

  this.getAlgorithmName = function () {
    return "http://mySigningAlgorithm";
  };
}
```

Custom transformation algorithm.

```javascript
function MyTransformation() {
  /*given a node (from the xmldom module) return its canonical representation (as string)*/
  this.process = function (node) {
    //you should apply your transformation before returning
    return node.toString();
  };

  this.getAlgorithmName = function () {
    return "http://myTransformation";
  };
}
```

Custom canonicalization is actually the same as custom transformation. It is applied on the SignedInfo rather than on references.

```javascript
function MyCanonicalization() {
  /*given a node (from the xmldom module) return its canonical representation (as string)*/
  this.process = function (node) {
    //you should apply your transformation before returning
    return "< x/>";
  };

  this.getAlgorithmName = function () {
    return "http://myCanonicalization";
  };
}
```

Now you need to register the new algorithms:

```javascript
/*register all the custom algorithms*/

signedXml.CanonicalizationAlgorithms["http://MyTransformation"] = MyTransformation;
signedXml.CanonicalizationAlgorithms["http://MyCanonicalization"] = MyCanonicalization;
signedXml.HashAlgorithms["http://myDigestAlgorithm"] = MyDigest;
signedXml.SignatureAlgorithms["http://mySigningAlgorithm"] = MySignatureAlgorithm;
```

Now do the signing. Note how we configure the signature to use the above algorithms:

```javascript
function signXml(xml, xpath, key, dest) {
  var options = {
    publicCert: fs.readFileSync("my_public_cert.pem", "latin1"),
    privateKey: fs.readFileSync(key),
    /*configure the signature object to use the custom algorithms*/
    signatureAlgorithm: "http://mySignatureAlgorithm",
    canonicalizationAlgorithm: "http://MyCanonicalization",
  };

  var sig = new SignedXml(options);

  sig.addReference({
    xpath: "//*[local-name(.)='x']",
    transforms: ["http://MyTransformation"],
    digestAlgorithm: "http://myDigestAlgorithm",
  });

  sig.addReference({
    xpath,
    transforms: ["http://MyTransformation"],
    digestAlgorithm: "http://myDigestAlgorithm",
  });
  sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
  sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  sig.computeSignature(xml);
  fs.writeFileSync(dest, sig.getSignedXml());
}

var xml = "<library>" + "<book>" + "<name>Harry Potter</name>" + "</book>";
("</library>");

signXml(xml, "//*[local-name(.)='book']", "client.pem", "result.xml");
```

You can always look at the actual code as a sample.

## Asynchronous signing and verification

If the private key is not stored locally, and you wish to use a signing server or Hardware Security Module (HSM) to sign documents, you can create a custom signing algorithm that uses an asynchronous callback.

```javascript
function AsyncSignatureAlgorithm() {
  this.getSignature = function (signedInfo, privateKey, callback) {
    var signer = crypto.createSign("RSA-SHA1");
    signer.update(signedInfo);
    var res = signer.sign(privateKey, "base64");
    //Do some asynchronous things here
    callback(null, res);
  };
  this.getAlgorithmName = function () {
    return "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  };
}

var sig = new SignedXml({ signatureAlgorithm: "http://asyncSignatureAlgorithm" });
sig.SignatureAlgorithms["http://asyncSignatureAlgorithm"] = AsyncSignatureAlgorithm;
sig.signatureAlgorithm = "http://asyncSignatureAlgorithm";
sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
sig.computeSignature(xml, opts, function (err) {
  var signedResponse = sig.getSignedXml();
});
```

The function `sig.checkSignature` may also use a callback if asynchronous verification is needed.

## X.509 / Key formats

Xml-Crypto internally relies on node's crypto module. This means pem encoded certificates are supported. So to sign an xml use key.pem that looks like this (only the beginning of the key content is shown):

```text
-----BEGIN PRIVATE KEY-----
MIICdwIBADANBgkqhkiG9w0...
-----END PRIVATE KEY-----
```

And for verification use key_public.pem:

```text
-----BEGIN CERTIFICATE-----
MIIBxDCCAW6gAwIBAgIQxUSX...
-----END CERTIFICATE-----
```

### Converting .pfx certificates to pem

If you have .pfx certificates you can convert them to .pem using [openssl](http://www.openssl.org/):

```shell
openssl pkcs12 -in c:\certs\yourcert.pfx -out c:\certs\cag.pem
```

Then you could use the result as is for the purpose of signing. For the purpose of validation open the resulting .pem with a text editor and copy from -----BEGIN CERTIFICATE----- to -----END CERTIFICATE----- (including) to a new text file and save it as .pem.

## Examples

### how to sign a root node (_coming soon_)

### how to add a prefix for the signature

Use the `prefix` option when calling `computeSignature` to add a prefix to the signature.

```javascript
var SignedXml = require("xml-crypto").SignedXml,
  fs = require("fs");

var xml = "<library>" + "<book>" + "<name>Harry Potter</name>" + "</book>" + "</library>";

var sig = new SignedXml({ privateKey: fs.readFileSync("client.pem") });
sig.addReference({
  xpath: "//*[local-name(.)='book']",
  digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  transforms: ["http://www.w3.org/2001/10/xml-exc-c14n#"],
});
sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
sig.computeSignature(xml, {
  prefix: "ds",
});
```

### how to specify the location of the signature

Use the `location` option when calling `computeSignature` to move the signature around.
Set `action` to one of the following:

- append(default) - append to the end of the xml document
- prepend - prepend to the xml document
- before - prepend to a specific node (use the `referenceNode` property)
- after - append to specific node (use the `referenceNode` property)

```javascript
var SignedXml = require("xml-crypto").SignedXml,
  fs = require("fs");

var xml = "<library>" + "<book>" + "<name>Harry Potter</name>" + "</book>" + "</library>";

var sig = new SignedXml({ privateKey: fs.readFileSync("client.pem") });
sig.addReference({
  xpath: "//*[local-name(.)='book']",
  digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  transforms: ["http://www.w3.org/2001/10/xml-exc-c14n#"],
});
sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
sig.computeSignature(xml, {
  location: { reference: "//*[local-name(.)='book']", action: "after" }, //This will place the signature after the book element
});
```

### more examples (_coming soon_)

## Development

The testing framework we use is [Mocha](https://github.com/mochajs/mocha) with [Chai](https://github.com/chaijs/chai) as the assertion framework.

To run tests use:

```shell
npm test
```

## More information

Visit my [blog](http://webservices20.blogspot.com/) or my [twitter](http://twitter.com/#!/YaronNaveh)

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/yaronn/xml-crypto/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

## License

This project is licensed under the [MIT License](http://opensource.org/licenses/MIT). See the [LICENSE](LICENSE) file for more info.
