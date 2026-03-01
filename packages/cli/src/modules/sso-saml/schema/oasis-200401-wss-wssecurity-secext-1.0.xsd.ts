import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'oasis-200401-wss-wssecurity-secext-1.0.xsd',
	contents: `<?xml version="1.0" encoding="UTF-8"?>
<!-- 
OASIS takes no position regarding the validity or scope of any intellectual property or other rights that might be claimed to pertain to the implementation or use of the technology described in this document or the extent to which any license under such rights might or might not be available; neither does it represent that it has made any effort to identify any such rights. Information on OASIS's procedures with respect to rights in OASIS specifications can be found at the OASIS website. Copies of claims of rights made available for publication and any assurances of licenses to be made available, or the result of an attempt made to obtain a general license or permission for the use of such proprietary rights by implementors or users of this specification, can be obtained from the OASIS Executive Director.
OASIS invites any interested party to bring to its attention any copyrights, patents or patent applications, or other proprietary rights which may cover technology that may be required to implement this specification. Please address the information to the OASIS Executive Director.
Copyright © OASIS Open 2002-2004. All Rights Reserved.
This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist in its implementation may be prepared, copied, published and distributed, in whole or in part, without restriction of any kind, provided that the above copyright notice and this paragraph are included on all such copies and derivative works. However, this document itself does not be modified in any way, such as by removing the copyright notice or references to OASIS, except as needed for the purpose of developing OASIS specifications, in which case the procedures for copyrights defined in the OASIS Intellectual Property Rights document must be followed, or as required to translate it into languages other than English.
The limited permissions granted above are perpetual and will not be revoked by OASIS or its successors or assigns.
This document and the information contained herein is provided on an “AS IS” basis and OASIS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
-->
<xsd:schema targetNamespace="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" elementFormDefault="qualified" attributeFormDefault="unqualified" blockDefault="#all" version="0.2">
	<xsd:import namespace="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" schemaLocation="oasis-200401-wss-wssecurity-utility-1.0.xsd"/>
	<xsd:import namespace="http://www.w3.org/XML/1998/namespace" schemaLocation="xml.xsd"/>
	<xsd:import namespace="http://www.w3.org/2000/09/xmldsig#" schemaLocation="xmldsig-core-schema.xsd"/>
	<xsd:complexType name="AttributedString">
		<xsd:annotation>
			<xsd:documentation>This type represents an element with arbitrary attributes.</xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="xsd:string">
				<xsd:attribute ref="wsu:Id"/>
				<xsd:anyAttribute namespace="##other" processContents="lax"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:complexType name="PasswordString">
		<xsd:annotation>
			<xsd:documentation>This type is used for password elements per Section 4.1.</xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="wsse:AttributedString">
				<xsd:attribute name="Type" type="xsd:anyURI"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:complexType name="EncodedString">
		<xsd:annotation>
			<xsd:documentation>This type is used for elements containing stringified binary data.</xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="wsse:AttributedString">
				<xsd:attribute name="EncodingType" type="xsd:anyURI"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:complexType name="UsernameTokenType">
		<xsd:annotation>
			<xsd:documentation>This type represents a username token per Section 4.1</xsd:documentation>
		</xsd:annotation>
		<xsd:sequence>
			<xsd:element name="Username" type="wsse:AttributedString"/>
			<xsd:any processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
		</xsd:sequence>
		<xsd:attribute ref="wsu:Id"/>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:complexType name="BinarySecurityTokenType">
		<xsd:annotation>
			<xsd:documentation>A security token that is encoded in binary</xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="wsse:EncodedString">
				<xsd:attribute name="ValueType" type="xsd:anyURI"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:complexType name="KeyIdentifierType">
		<xsd:annotation>
			<xsd:documentation>A security token key identifier</xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="wsse:EncodedString">
				<xsd:attribute name="ValueType" type="xsd:anyURI"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:simpleType name="tUsage">
		<xsd:annotation>
			<xsd:documentation>Typedef to allow a list of usages (as URIs).</xsd:documentation>
		</xsd:annotation>
		<xsd:list itemType="xsd:anyURI"/>
	</xsd:simpleType>
	<xsd:attribute name="Usage" type="tUsage">
		<xsd:annotation>
			<xsd:documentation>This global attribute is used to indicate the usage of a referenced or indicated token within the containing context</xsd:documentation>
		</xsd:annotation>
	</xsd:attribute>
	<xsd:complexType name="ReferenceType">
		<xsd:annotation>
			<xsd:documentation>This type represents a reference to an external security token.</xsd:documentation>
		</xsd:annotation>
		<xsd:attribute name="URI" type="xsd:anyURI"/>
		<xsd:attribute name="ValueType" type="xsd:anyURI"/>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:complexType name="EmbeddedType">
		<xsd:annotation>
			<xsd:documentation>This type represents a reference to an embedded security token.</xsd:documentation>
		</xsd:annotation>
		<xsd:choice minOccurs="0" maxOccurs="unbounded">
			<xsd:any processContents="lax"/>
		</xsd:choice>
		<xsd:attribute name="ValueType" type="xsd:anyURI"/>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:complexType name="SecurityTokenReferenceType">
		<xsd:annotation>
			<xsd:documentation>This type is used reference a security token.</xsd:documentation>
		</xsd:annotation>
		<xsd:choice minOccurs="0" maxOccurs="unbounded">
			<xsd:any processContents="lax"/>
		</xsd:choice>
		<xsd:attribute ref="wsu:Id"/>
		<xsd:attribute ref="wsse:Usage"/>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:complexType name="SecurityHeaderType">
		<xsd:annotation>
			<xsd:documentation>This complexType defines header block to use for security-relevant data directed at a specific SOAP actor.</xsd:documentation>
		</xsd:annotation>
		<xsd:sequence>
			<xsd:any processContents="lax" minOccurs="0" maxOccurs="unbounded">
				<xsd:annotation>
					<xsd:documentation>The use of "any" is to allow extensibility and different forms of security data.</xsd:documentation>
				</xsd:annotation>
			</xsd:any>
		</xsd:sequence>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:complexType name="TransformationParametersType">
		<xsd:annotation>
			<xsd:documentation>This complexType defines a container for elements to be specified from any namespace as properties/parameters of a DSIG transformation.</xsd:documentation>
		</xsd:annotation>
		<xsd:sequence>
			<xsd:any processContents="lax" minOccurs="0" maxOccurs="unbounded">
				<xsd:annotation>
					<xsd:documentation>The use of "any" is to allow extensibility from any namespace.</xsd:documentation>
				</xsd:annotation>
			</xsd:any>
		</xsd:sequence>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:complexType>
	<xsd:element name="UsernameToken" type="wsse:UsernameTokenType">
		<xsd:annotation>
			<xsd:documentation>This element defines the wsse:UsernameToken element per Section 4.1.</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="BinarySecurityToken" type="wsse:BinarySecurityTokenType">
		<xsd:annotation>
			<xsd:documentation>This element defines the wsse:BinarySecurityToken element per Section 4.2.</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="Reference" type="wsse:ReferenceType">
		<xsd:annotation>
			<xsd:documentation>This element defines a security token reference</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="Embedded" type="wsse:EmbeddedType">
		<xsd:annotation>
			<xsd:documentation>This element defines a security token embedded reference</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="KeyIdentifier" type="wsse:KeyIdentifierType">
		<xsd:annotation>
			<xsd:documentation>This element defines a key identifier reference</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="SecurityTokenReference" type="wsse:SecurityTokenReferenceType">
		<xsd:annotation>
			<xsd:documentation>This element defines the wsse:SecurityTokenReference per Section 4.3.</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="Security" type="wsse:SecurityHeaderType">
		<xsd:annotation>
			<xsd:documentation>This element defines the wsse:Security SOAP header element per Section 4.</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="TransformationParameters" type="wsse:TransformationParametersType">
		<xsd:annotation>
			<xsd:documentation>This element contains properties for transformations from any namespace, including DSIG.</xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="Password" type="wsse:PasswordString"/>
	<xsd:element name="Nonce" type="wsse:EncodedString"/>
	<xsd:simpleType name="FaultcodeEnum">
		<xsd:restriction base="xsd:QName">
			<xsd:enumeration value="wsse:UnsupportedSecurityToken"/>
			<xsd:enumeration value="wsse:UnsupportedAlgorithm"/>
			<xsd:enumeration value="wsse:InvalidSecurity"/>
			<xsd:enumeration value="wsse:InvalidSecurityToken"/>
			<xsd:enumeration value="wsse:FailedAuthentication"/>
			<xsd:enumeration value="wsse:FailedCheck"/>
			<xsd:enumeration value="wsse:SecurityTokenUnavailable"/>
		</xsd:restriction>
	</xsd:simpleType>
</xsd:schema>`,
};
