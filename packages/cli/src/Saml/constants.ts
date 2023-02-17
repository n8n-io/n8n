export const sampleIPMetadata = `
<md:EntityDescriptor xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" ID="_425272d5c1c58f945147a5bf17c086767b7ba98a7b54a065b85fdad7725259be" entityID="authentik">
  <ds:Signature>
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#_425272d5c1c58f945147a5bf17c086767b7ba98a7b54a065b85fdad7725259be">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>XJl0E8UV07jQuvoM79pYosdUx4Y7ZeofTDnq/kmMH9U=</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>JtS3Ro0m4wmOpqpKwiLqMDMYKe7KzlcGlaQd+vkTXPS4eu52i5L6bC4jOlJ0Ma8I 2UMmoOO8yCDv0bbYDagcQRTcKLwT9vem14vNXtR0JWZaAQvNP/36jHqbCxHgjrtV CnKaRMxSU3eLu0gxRpCD3AyYgixEimmcIpEcV3NNNANy0XnrlxkkSwP3RRMZTlKG UovjBI1GqoCcQXx1fKreGdiGy6ahC8VxLEyRi5rA/SWA1LuyxKLy4c9fTwLhhJH9 6B6O3Jagxa7uVBt51eKSwqQFRGFrQurQUD/l/iSKkpT8R4cwEsKre0P07AEI11l3 RSvyyhdmgR7LKgsC3OC+ZMItFBEsjdBg42IAzpU0G861FofypURCiJSHX8wYJchQ hxXvpfdXfkWf27s5h7jUVwcwGpOW1fT0Ojv5IUrKHS+j4yrW2IIUJBiXcTmRsc49 PrsNI/KBDWjTMNyrl683AWrUt40mw6PlM+jRwZ0BGcXg5EFK9ukf7ieLYA/JWG6r YLCQhZf5IudWBmaYnryqbqfenD8/0oXS/ATnORy6cMaRWGS9DuKRNZcs05rWIvLs g28aMlSXGHwvwWKF9b8P82MeG/ucJd+z6bUBPnL6jl0EXwMsrAxNZ0qH70wNJrQE nFYNsmY3M0n5nnjeRwRMR3WXHZcMIn245wcinVcedQ0=</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>MIIFUzCCAzugAwIBAgIRAORoQEwazk8zoDnd1svP5VcwDQYJKoZIhvcNAQELBQAw HTEbMBkGA1UEAwwSYXV0aGVudGlrIDIwMjMuMi4yMB4XDTIzMDIxNTE0NDUyNFoX DTI0MDIxNjE0NDUyNFowVjEqMCgGA1UEAwwhYXV0aGVudGlrIFNlbGYtc2lnbmVk IENlcnRpZmljYXRlMRIwEAYDVQQKDAlhdXRoZW50aWsxFDASBgNVBAsMC1NlbGYt c2lnbmVkMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAp45RJrV8n4dA hoySqph9fbPSQq5R4siF6jKvNPApQLAKgBPPEKX9Ba2R6bas4JRW7uNr8r/TOWmn A0HVLdK6ClsTGdhtdhLrGv91NJrwBarY24a9A+wwz97w2SWAj1QGsc9+IxbraUJP r0Y/0JF7Amyz0iDvF8KHxRl/Up9rK5RPsH8DX+GO1sFc0eNpZ8XYmpJb9GveHerA QilCLrwrlzmkNneAHKpYR2NYMEgjeB6VmqEYqW6DQ52nP2W6pyQbZtGpdbTQaVC5 wOgbjPKVit4MBMQou3P5skrY5D3qezMON4qjP12greBLU0lGGJYJLWTDqAtC0kxG 4c05xzxOR4t1QoAG63bvtQc8BL2WOIe0hiqAy3SBKy2fqwFW6ISIWFFye62p5GBK 2a/ILq/FYbhyQkiEWvCCe0SNx3WJsTjLBLwZ24BGMxhAYkH7RVkDybVcdW2MqAMV RQeXu0Ijwbkq10RKF4W21qnLcCXWyftbtyLzjpZl8bmegR+kkTwNQgL6aOzSBXCa V8Th5GFOa/ysVo/nYJraORbFsUnSG4MbkfSTppDRyfwTpjGvFDw4f5qjh0fhEuRo LZV+qKAkeX8Pp5Ld+9bjJLo/szNDpgiZZJGmdjL/ac91wYfvRxs30FxGWAR0XhCo +QvaM3UE7qsRUhYKelG760yFZ91VqUkCAwEAAaNVMFMwUQYDVR0RAQH/BEcwRYJD V2FYNGV3QnVLRDJ2V3B5eWNhSzdoY2RSZmgzeXg0OHlHRmdsRnA3Ui5zZWxmLXNp Z25lZC5nb2F1dGhlbnRpay5pbzANBgkqhkiG9w0BAQsFAAOCAgEAbt5zcEVa9lVy SfXRSieqkz5153/QOGQ0ycAb6skboWdKQCYQbqbpn9d2oq8/SmIT+rnI1kMYNxq7 03Eq6zwsZm9tVX3mz7kcfqvk/tnMQdtwis4fO3a+hOxpHDewWzb68vdZJpjJMJmv SUtB+CzQzyiBPDcMGxPT9+4eXhjTI82KKVabxHUMU1P7MTQmxgW/VCWbZvasWSpc hEvk5XNbVHQaOyhTJe0RwL+Q7FMQ/zZA5jU5FCDCCfILzi9GmAXzw+K0t4FziGC0 84pAcSFPK3yntYSHTOo2mliiZoodz5GzlRBKEJBll4lvSEfOVxIADc3O/1m3NA/n CvSXYOcAhMlT8UHwyvn7QsUL2+Yvthl72skSuaPqa8YFWqIgr2qj74wbRRxZvhqD ZwTxK3vRp15otRslAztZAAtHPHgd1xobocHZdN2MHJrx582DXlofJ7ybT2ObmDsx XqK094JE1b0+j3YQcOnYtEVSWPmAar2Ie+sB5oP/Td3W3UM/RruFoepJC+xzUcBz xn8p1LvwJ0ixxrMtZ7g+WXu3K5yNEluZ97nam4NRyniUl/CSIRzRqBN7Tkmwj7+v JEqZWiCyC4Ea/CYqa68lu0S4G5BuOLYpqsPkSvkgXVwOwHpTuMaYR1oO06I+gw49 2QsU5ZdOT7EJndfrdjuqew+vaEsvHaY=</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIFUzCCAzugAwIBAgIRAORoQEwazk8zoDnd1svP5VcwDQYJKoZIhvcNAQELBQAwHTEbMBkGA1UEAwwSYXV0aGVudGlrIDIwMjMuMi4yMB4XDTIzMDIxNTE0NDUyNFoXDTI0MDIxNjE0NDUyNFowVjEqMCgGA1UEAwwhYXV0aGVudGlrIFNlbGYtc2lnbmVkIENlcnRpZmljYXRlMRIwEAYDVQQKDAlhdXRoZW50aWsxFDASBgNVBAsMC1NlbGYtc2lnbmVkMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAp45RJrV8n4dAhoySqph9fbPSQq5R4siF6jKvNPApQLAKgBPPEKX9Ba2R6bas4JRW7uNr8r/TOWmnA0HVLdK6ClsTGdhtdhLrGv91NJrwBarY24a9A+wwz97w2SWAj1QGsc9+IxbraUJPr0Y/0JF7Amyz0iDvF8KHxRl/Up9rK5RPsH8DX+GO1sFc0eNpZ8XYmpJb9GveHerAQilCLrwrlzmkNneAHKpYR2NYMEgjeB6VmqEYqW6DQ52nP2W6pyQbZtGpdbTQaVC5wOgbjPKVit4MBMQou3P5skrY5D3qezMON4qjP12greBLU0lGGJYJLWTDqAtC0kxG4c05xzxOR4t1QoAG63bvtQc8BL2WOIe0hiqAy3SBKy2fqwFW6ISIWFFye62p5GBK2a/ILq/FYbhyQkiEWvCCe0SNx3WJsTjLBLwZ24BGMxhAYkH7RVkDybVcdW2MqAMVRQeXu0Ijwbkq10RKF4W21qnLcCXWyftbtyLzjpZl8bmegR+kkTwNQgL6aOzSBXCaV8Th5GFOa/ysVo/nYJraORbFsUnSG4MbkfSTppDRyfwTpjGvFDw4f5qjh0fhEuRoLZV+qKAkeX8Pp5Ld+9bjJLo/szNDpgiZZJGmdjL/ac91wYfvRxs30FxGWAR0XhCo+QvaM3UE7qsRUhYKelG760yFZ91VqUkCAwEAAaNVMFMwUQYDVR0RAQH/BEcwRYJDV2FYNGV3QnVLRDJ2V3B5eWNhSzdoY2RSZmgzeXg0OHlHRmdsRnA3Ui5zZWxmLXNpZ25lZC5nb2F1dGhlbnRpay5pbzANBgkqhkiG9w0BAQsFAAOCAgEAbt5zcEVa9lVySfXRSieqkz5153/QOGQ0ycAb6skboWdKQCYQbqbpn9d2oq8/SmIT+rnI1kMYNxq703Eq6zwsZm9tVX3mz7kcfqvk/tnMQdtwis4fO3a+hOxpHDewWzb68vdZJpjJMJmvSUtB+CzQzyiBPDcMGxPT9+4eXhjTI82KKVabxHUMU1P7MTQmxgW/VCWbZvasWSpchEvk5XNbVHQaOyhTJe0RwL+Q7FMQ/zZA5jU5FCDCCfILzi9GmAXzw+K0t4FziGC084pAcSFPK3yntYSHTOo2mliiZoodz5GzlRBKEJBll4lvSEfOVxIADc3O/1m3NA/nCvSXYOcAhMlT8UHwyvn7QsUL2+Yvthl72skSuaPqa8YFWqIgr2qj74wbRRxZvhqDZwTxK3vRp15otRslAztZAAtHPHgd1xobocHZdN2MHJrx582DXlofJ7ybT2ObmDsxXqK094JE1b0+j3YQcOnYtEVSWPmAar2Ie+sB5oP/Td3W3UM/RruFoepJC+xzUcBzxn8p1LvwJ0ixxrMtZ7g+WXu3K5yNEluZ97nam4NRyniUl/CSIRzRqBN7Tkmwj7+vJEqZWiCyC4Ea/CYqa68lu0S4G5BuOLYpqsPkSvkgXVwOwHpTuMaYR1oO06I+gw492QsU5ZdOT7EJndfrdjuqew+vaEsvHaY=</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://192.168.178.32:9000/application/saml/n8n/slo/binding/redirect/"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://192.168.178.32:9000/application/saml/n8n/slo/binding/post/"/>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:X509SubjectName</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://192.168.178.32:9000/application/saml/n8n/sso/binding/redirect/"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://192.168.178.32:9000/application/saml/n8n/sso/binding/post/"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
`;

export const sampleSPMetadata = `
<EntityDescriptor
 xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
 xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
 entityID="http://localhost:5678/rest/sso/metadata">
    <SPSSODescriptor WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
        <AssertionConsumerService isDefault="true" index="0" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://192.168.178.20:5678/rest/sso/acs"/>
    </SPSSODescriptor>
</EntityDescriptor>
`;
