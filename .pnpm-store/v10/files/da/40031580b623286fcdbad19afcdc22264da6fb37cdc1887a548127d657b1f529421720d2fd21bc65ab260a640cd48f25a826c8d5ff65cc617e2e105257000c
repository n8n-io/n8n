var escapehtml = require('escape-html');

module.exports = ({ encryptionPublicCert, encryptedKey, keyEncryptionMethod }) => `
<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <e:EncryptedKey xmlns:e="http://www.w3.org/2001/04/xmlenc#">
    <e:EncryptionMethod Algorithm="${escapehtml(keyEncryptionMethod)}">
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />
    </e:EncryptionMethod>
    <KeyInfo>
      ${encryptionPublicCert}
    </KeyInfo>
    <e:CipherData>
      <e:CipherValue>${escapehtml(encryptedKey)}</e:CipherValue>
    </e:CipherData>
  </e:EncryptedKey>
</KeyInfo>
`;

