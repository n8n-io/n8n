import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'ws-securitypolicy-1.2.xsd',
	contents: `<?xml version="1.0" encoding="utf-8"?>
<!-- 
OASIS takes no position regarding the validity or scope of any intellectual property or other rights that might be claimed to pertain to the 
implementation or use of the technology described in this document or the extent to which any license under such rights might or might not be available; 
neither does it represent that it has made any effort to identify any such rights. Information on OASIS's procedures with respect to rights in OASIS 
specifications can be found at the OASIS website. Copies of claims of rights made available for publication and any assurances of licenses to be made 
available, or the result of an attempt made to obtain a general license or permission for the use of such proprietary rights by implementors or users 
of this specification, can be obtained from the OASIS Executive Director.
OASIS invites any interested party to bring to its attention any copyrights, patents or patent applications, or other proprietary rights which may 
cover technology that may be required to implement this specification. Please address the information to the OASIS Executive Director.
Copyright © OASIS Open 2002-2007. All Rights Reserved.
This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist 
in its implementation may be prepared, copied, published and distributed, in whole or in part, without restriction of any kind, provided that the 
above copyright notice and this paragraph are included on all such copies and derivative works. However, this document itself does not be modified 
in any way, such as by removing the copyright notice or references to OASIS, except as needed for the purpose of developing OASIS specifications, 
in which case the procedures for copyrights defined in the OASIS Intellectual Property Rights document must be followed, or as required to translate 
it into languages other than English.
The limited permissions granted above are perpetual and will not be revoked by OASIS or its successors or assigns.
This document and the information contained herein is provided on an AS IS basis and OASIS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF 
MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
-->
<xs:schema
	targetNamespace='http://docs.oasis-open.org/ws-sx/ws-securitypolicy/200702'
  xmlns:tns='http://docs.oasis-open.org/ws-sx/ws-securitypolicy/200702'
	xmlns:wsa="http://www.w3.org/2005/08/addressing"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
	elementFormDefault="qualified"
	blockDefault="#all" >

  <xs:import namespace="http://www.w3.org/2005/08/addressing" 
		schemaLocation="ws-addr.xsd" />

  <!--
	4. Protection Assertions
	-->
  <xs:element name="SignedParts" type="tns:SePartsType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        4.1.1 SignedParts Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="EncryptedParts" type="tns:SePartsType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        4.2.1 EncryptedParts Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="SePartsType">
    <xs:sequence>
      <xs:element name="Body" type="tns:EmptyType" minOccurs="0" />
      <xs:element name="Header" type="tns:HeaderType" minOccurs="0" maxOccurs="unbounded" />
      <xs:element name="Attachments" type="tns:EmptyType" minOccurs="0" />
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax"/>
    </xs:sequence>
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>
  <xs:complexType name="EmptyType" />
  <xs:complexType name="HeaderType" >
    <xs:attribute name="Name" type="xs:QName" use="optional" />
    <xs:attribute name="Namespace" type="xs:anyURI" use="required" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <xs:element name="SignedElements" type="tns:SerElementsType" >
    <xs:annotation>
      <xs:documentation xml:lang="en" >
        4.1.2 SignedElements Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="EncryptedElements" type="tns:SerElementsType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        4.2.2 EncryptedElements Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequiredElements" type="tns:SerElementsType" >
    <xs:annotation>
      <xs:documentation xml:lang="en" >
        4.3.1 RequiredElements Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="SerElementsType">
    <xs:sequence>
      <xs:element name="XPath" type="xs:string" minOccurs="1" maxOccurs="unbounded" />
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax"/>
    </xs:sequence>
    <xs:attribute name="XPathVersion" type="xs:anyURI" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <!--
	5. Token Assertions
	-->
  <xs:attribute name="IncludeToken" type="tns:IncludeTokenOpenType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.1 Token Inclusion
      </xs:documentation>
    </xs:annotation>
  </xs:attribute>
  <xs:simpleType name="IncludeTokenOpenType">
    <xs:union memberTypes="tns:IncludeTokenType xs:anyURI" />
  </xs:simpleType>
  <xs:simpleType name="IncludeTokenType">
    <xs:restriction base="xs:anyURI" >
      <xs:enumeration value="http://docs.oasis-open.org/ws-sx/ws-trust/200702/ws-securitypolicy/IncludeToken/Never" />
      <xs:enumeration value="http://docs.oasis-open.org/ws-sx/ws-trust/200702/ws-securitypolicy/IncludeToken/Once" />
      <xs:enumeration value="http://docs.oasis-open.org/ws-sx/ws-trust/200702/ws-securitypolicy/IncludeToken/AlwaysToRecipient" />
      <xs:enumeration value="http://docs.oasis-open.org/ws-sx/ws-trust/200702/ws-securitypolicy/IncludeToken/AlwaysToInitiator" />
      <xs:enumeration value="http://docs.oasis-open.org/ws-sx/ws-trust/200702/ws-securitypolicy/IncludeToken/Always" />
    </xs:restriction>
  </xs:simpleType>

  <xs:element name="UsernameToken" type="tns:TokenAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en" >
        5.4.1 UsernameToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="TokenAssertionType">
    <xs:sequence>
      <xs:choice minOccurs="0">
        <xs:element name="Issuer" type="wsa:EndpointReferenceType" />
        <xs:element name="IssuerName" type="xs:anyURI" />
      </xs:choice>
      <!--
			Actual content model is non-deterministic, hence wildcard. The following shows intended content model:
			<xs:element ref="wsp:Policy" minOccurs="0" />
			-->
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax"/>
    </xs:sequence>
    <xs:attribute ref="tns:IncludeToken" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <xs:element name="NoPassword" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.1 UsernameToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="HashPassword" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.1 UsernameToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssUsernameToken10" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.1 UsernameToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssUsernameToken11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.1 UsernameToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined below. -->
  <!-- RequireImpliedDerivedKeys defined below. -->
  <!-- RequireExplicitDerivedKeys defined below. -->

  <xs:complexType name="QNameAssertionType">
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <xs:element name="IssuedToken" type="tns:IssuedTokenType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="IssuedTokenType">
    <xs:sequence>
      <xs:choice minOccurs="0">
        <xs:element name="Issuer" type="wsa:EndpointReferenceType" />
        <xs:element name="IssuerName" type="xs:anyURI" />
      </xs:choice>
      <xs:element name="RequestSecurityTokenTemplate" type="tns:RequestSecurityTokenTemplateType" />
      <!--
			Actual content model is non-deterministic, hence wildcard. The following shows intended content model:
			<xs:element ref="wsp:Policy" minOccurs="0" />
			-->
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax" />
    </xs:sequence>
    <xs:attribute ref="tns:IncludeToken" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>
  <xs:complexType name="RequestSecurityTokenTemplateType">
    <xs:sequence>
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax" />
    </xs:sequence>
    <xs:attribute name="TrustVersion" type="xs:anyURI" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <xs:element name="RequireDerivedKeys" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireImpliedDerivedKeys" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireExplicitDerivedKeys" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireExternalReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireInternalReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.2 IssuedToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="X509Token" type="tns:TokenAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  
  <xs:element name="RequireKeyIdentifierReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireIssuerSerialReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireEmbeddedTokenReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireThumbprintReference" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509V3Token10" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509Pkcs7Token10" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509PkiPathV1Token10" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509V1Token11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509V3Token11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509Pkcs7Token11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssX509PkiPathV1Token11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.3 X509Token Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="KerberosToken" type="tns:TokenAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.4 KerberosToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  <!-- RequireKeyIdentifierReference defined above. -->

  <xs:element name="WssKerberosV5ApReqToken11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.4 KerberosToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssGssKerberosV5ApReqToken11" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.4 KerberosToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="SpnegoContextToken" type="tns:SpnegoContextTokenType" >
    <xs:annotation>
      <xs:documentation xml:lang="en" >
        5.4.5 SpnegoContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="SpnegoContextTokenType">
    <xs:sequence>
      <xs:choice minOccurs="0">
        <xs:element name="Issuer" type="wsa:EndpointReferenceType" />
        <xs:element name="IssuerName" type="xs:anyURI" />
      </xs:choice>
      <!--
			Actual content model is non-deterministic, hence wildcard. The following shows intended content model:
			<xs:element ref="wsp:Policy" minOccurs="0" />
			-->
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax" />
    </xs:sequence>
    <xs:attribute ref="tns:IncludeToken" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  <xs:element name="MustNotSendCancel" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.5 SpnegoContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustNotSendAmend" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.5 SpnegoContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustNotSendRenew" type="tns:QNameAssertionType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.5 SpnegoContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="SecurityContextToken" type="tns:TokenAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.6 SecurityContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->

  <xs:element name="RequireExternalUriReference" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.6 SecurityContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="SC13SecurityContextToken" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.6 SecurityContextToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="SecureConversationToken" type="tns:SecureConversationTokenType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.7 SecureConversationToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="SecureConversationTokenType">
    <xs:sequence>
      <xs:choice minOccurs="0">
        <xs:element name="Issuer" type="wsa:EndpointReferenceType" />
        <xs:element name="IssuerName" type="xs:anyURI" />
      </xs:choice>
      <!--
			Actual content model is non-deterministic, hence wildcard. The following shows intended content model:
			<xs:element ref="wsp:Policy" minOccurs="0" />
			-->
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax" />
    </xs:sequence>
    <xs:attribute ref="tns:IncludeToken" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  <!-- RequireExternalUriReference defined above. -->
  <!-- SC13SecurityContextToken defined above. -->
  <!-- MustNotSendCancel defined above. -->
  <!-- MustNotSendAmend defined above. -->
  <!-- MustNotSendRenew defined above. -->

  <xs:element name="BootstrapPolicy" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.7 SecureConversationToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="SamlToken" type="tns:TokenAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en" >
        5.4.8 SamlToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  <!-- RequireKeyIdentifierReference defined above. -->

  <xs:element name="WssSamlV11Token10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.8 SamlToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssSamlV11Token11" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.8 SamlToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssSamlV20Token11" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.8 SamlToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="RelToken" type="tns:TokenAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.9 RelToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- RequireDerivedKeys defined above. -->
  <!-- RequireImpliedDerivedKeys defined above. -->
  <!-- RequireExplicitDerivedKeys defined above. -->
  <!-- RequireKeyIdentifierReference defined above. -->

  <xs:element name="WssRelV10Token10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.9 RelToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssRelV20Token10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.9 RelToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssRelV10Token11" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.9 RelToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="WssRelV20Token11" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.9 RelToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="HttpsToken" type="tns:TokenAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.10 HttpsToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="HttpBasicAuthentication" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.10 HttpsToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="HttpDigestAuthentication" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.10 HttpsToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireClientCertificate" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.10 HttpsToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  
  <xs:element name="KeyValueToken" type="tns:KeyValueTokenType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.11 KeyValueToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="KeyValueTokenType">
    <xs:sequence>
      <!--
			Actual content model is non-deterministic, hence wildcard. The following shows intended content model:
			<xs:element ref="wsp:Policy" minOccurs="0" />
			-->
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax" />
    </xs:sequence>
    <xs:attribute ref="tns:IncludeToken" use="optional" />
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>
  <xs:element name="RsaKeyValue" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        5.4.11 KeyValueToken Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  
  <!--
	7. Security Binding Assertions
	-->
  <xs:element name="AlgorithmSuite" type="tns:NestedPolicyType" >
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:complexType name="NestedPolicyType">
    <xs:sequence>
      <xs:any minOccurs="0" maxOccurs="unbounded" namespace="##other" processContents="lax"/>
    </xs:sequence>
    <xs:anyAttribute namespace="##any" processContents="lax" />
  </xs:complexType>

  <xs:element name="Basic256" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic192" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic128" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="TripleDes" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic256Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic192Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic128Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="TripleDesRsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic256Sha256" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic192Sha256" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic128Sha256" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="TripleDesSha256" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic256Sha256Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic192Sha256Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Basic128Sha256Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="TripleDesSha256Rsa15" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="InclusiveC14N" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="SOAPNormalization10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="STRTransform10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="XPath10" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="XPathFilter20" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="AbsXPath" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.1 AlgorithmSuite Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="Layout" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.2 Layout Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="Strict" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.2 Layout Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="Lax" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.2 Layout Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="LaxTsFirst" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.2 Layout Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="LaxTsLast" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.2 Layout Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="TransportBinding" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.3 TransportBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="TransportToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.3 TransportBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- Layout defined above. -->

  <xs:element name="IncludeTimestamp" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.3 TransportBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="SymmetricBinding" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="EncryptionToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="SignatureToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8=7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="ProtectionToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- Layout defined above. -->
  <!-- IncludeTimestamp defined above. -->

  <xs:element name="EncryptBeforeSigning" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="EncryptSignature" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="ProtectTokens" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="OnlySignEntireHeadersAndBody" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.4 SymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="AsymmetricBinding" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="InitiatorToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="InitiatorSignatureToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="InitiatorEncryptionToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="RecipientToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="RecipientSignatureToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="RecipientEncryptionToken" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        7.5 AsymmetricBinding Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- Layout defined above. -->
  <!-- IncludeTimestamp defined above. -->
  <!-- EncryptBeforeSigning defined above. -->
  <!-- EncryptSignature defined above. -->
  <!-- ProtectTokens defined above. -->
  <!-- OnlySignEntireHeadersAndBody defined above. -->

  <!--
	8. Supporting Tokens
	-->
  <xs:element name="SupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.1 SupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="SignedSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.2 SignedSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="EndorsingSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.3 EndorsingSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="SignedEndorsingSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.4 SignedEndorsingSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="SignedEncryptedSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.5 SignedEncryptedSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="EncryptedSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.6 EncryptedSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->
  
  <xs:element name="EndorsingEncryptedSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.7 EndorsingEncryptedSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->

  <xs:element name="SignedEndorsingEncryptedSupportingTokens" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        8.8 SignedEndorsingEncryptedSupportingTokens Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- AlgorithmSuite defined above. -->
  <!-- SignedParts defined above. -->
  <!-- SignedElements defined above. -->
  <!-- EncryptedParts defined above. -->
  <!-- EncryptedElements defined above. -->
  
  <!--
	9. WSS: SOAP Message Security Options
	-->
  <xs:element name="Wss10" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.1 Wss10 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="MustSupportRefKeyIdentifier" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.1 Wss10 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportRefIssuerSerial" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.1 Wss10 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportRefExternalURI" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.1 Wss10 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportRefEmbeddedToken" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.1 Wss10 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="Wss11" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.2 Wss11 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <!-- MustSupportRefKeyIdentifier defined above. -->
  <!-- MustSupportRefIssuerSerial defined above. -->
  <!-- MustSupportRefExternalURI defined above. -->
  <!-- MustSupportRefEmbeddedToken defined above. -->

  <xs:element name="MustSupportRefThumbprint" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.2 Wss11 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportRefEncryptedKey" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.2 Wss11 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireSignatureConfirmation" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        9.2 Wss11 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <!--
	10. WS-Trust Options
	-->
  <xs:element name="Trust13" type="tns:NestedPolicyType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <xs:element name="MustSupportClientChallenge" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportServerChallenge" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireClientEntropy" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireServerEntropy" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="MustSupportIssuedTokens" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireRequestSecurityTokenCollection" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  <xs:element name="RequireAppiesTo" type="tns:QNameAssertionType">
    <xs:annotation>
      <xs:documentation xml:lang="en">
        10.1 Trust13 Assertion
      </xs:documentation>
    </xs:annotation>
  </xs:element>
  
</xs:schema>`,
};
