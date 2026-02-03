import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'oasis-200401-wss-wssecurity-utility-1.0.xsd',
	contents: `<?xml version="1.0" encoding="UTF-8"?>
<!-- 
OASIS takes no position regarding the validity or scope of any intellectual property or other rights that might be claimed to pertain to the implementation or use of the technology described in this document or the extent to which any license under such rights might or might not be available; neither does it represent that it has made any effort to identify any such rights. Information on OASIS's procedures with respect to rights in OASIS specifications can be found at the OASIS website. Copies of claims of rights made available for publication and any assurances of licenses to be made available, or the result of an attempt made to obtain a general license or permission for the use of such proprietary rights by implementors or users of this specification, can be obtained from the OASIS Executive Director.
OASIS invites any interested party to bring to its attention any copyrights, patents or patent applications, or other proprietary rights which may cover technology that may be required to implement this specification. Please address the information to the OASIS Executive Director.
Copyright © OASIS Open 2002-2004. All Rights Reserved.
This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist in its implementation may be prepared, copied, published and distributed, in whole or in part, without restriction of any kind, provided that the above copyright notice and this paragraph are included on all such copies and derivative works. However, this document itself does not be modified in any way, such as by removing the copyright notice or references to OASIS, except as needed for the purpose of developing OASIS specifications, in which case the procedures for copyrights defined in the OASIS Intellectual Property Rights document must be followed, or as required to translate it into languages other than English.
The limited permissions granted above are perpetual and will not be revoked by OASIS or its successors or assigns.
This document and the information contained herein is provided on an “AS IS” basis and OASIS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
-->
<xsd:schema targetNamespace="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:xsd="http://www.w3.org/2001/XMLSchema" 



xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" 
elementFormDefault="qualified" attributeFormDefault="unqualified" version="0.1">
	<!-- // Fault Codes /////////////////////////////////////////// -->
	<xsd:simpleType name="tTimestampFault">
		<xsd:annotation>
			<xsd:documentation>
This type defines the fault code value for Timestamp message expiration.
          </xsd:documentation>
		</xsd:annotation>
		<xsd:restriction base="xsd:QName">
			<xsd:enumeration value="wsu:MessageExpired"/>
		</xsd:restriction>
	</xsd:simpleType>
	<!-- // Global attributes //////////////////////////////////// -->
	<xsd:attribute name="Id" type="xsd:ID">
		<xsd:annotation>
			<xsd:documentation>
This global attribute supports annotating arbitrary elements with an ID.
          </xsd:documentation>
		</xsd:annotation>
	</xsd:attribute>
	<xsd:attributeGroup name="commonAtts">
		<xsd:annotation>
			<xsd:documentation>
Convenience attribute group used to simplify this schema.
          </xsd:documentation>
		</xsd:annotation>
		<xsd:attribute ref="wsu:Id" use="optional"/>
		<xsd:anyAttribute namespace="##other" processContents="lax"/>
	</xsd:attributeGroup>
	<!-- // Utility types //////////////////////////////////////// -->
	<xsd:complexType name="AttributedDateTime">
		<xsd:annotation>
			<xsd:documentation>
This type is for elements whose [children] is a psuedo-dateTime and can have arbitrary attributes. 
      </xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="xsd:string">
				<xsd:attributeGroup ref="wsu:commonAtts"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<xsd:complexType name="AttributedURI">
		<xsd:annotation>
			<xsd:documentation>
This type is for elements whose [children] is an anyURI and can have arbitrary attributes.
      </xsd:documentation>
		</xsd:annotation>
		<xsd:simpleContent>
			<xsd:extension base="xsd:anyURI">
				<xsd:attributeGroup ref="wsu:commonAtts"/>
			</xsd:extension>
		</xsd:simpleContent>
	</xsd:complexType>
	<!-- // Timestamp header components /////////////////////////// -->
	<xsd:complexType name="TimestampType">
		<xsd:annotation>
			<xsd:documentation>
This complex type ties together the timestamp related elements into a composite type.
            </xsd:documentation>
		</xsd:annotation>
		<xsd:sequence>
			<xsd:element ref="wsu:Created" minOccurs="0"/>
			<xsd:element ref="wsu:Expires" minOccurs="0"/>
			<xsd:choice minOccurs="0" maxOccurs="unbounded">
				<xsd:any namespace="##other" processContents="lax"/>
			</xsd:choice>
		</xsd:sequence>
		<xsd:attributeGroup ref="wsu:commonAtts"/>
	</xsd:complexType>
	<xsd:element name="Timestamp" type="wsu:TimestampType">
		<xsd:annotation>
			<xsd:documentation>
This element allows Timestamps to be applied anywhere element wildcards are present,
including as a SOAP header.
            </xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<!-- global element decls to allow individual elements to appear anywhere -->
	<xsd:element name="Expires" type="wsu:AttributedDateTime">
		<xsd:annotation>
			<xsd:documentation>
This element allows an expiration time to be applied anywhere element wildcards are present.
            </xsd:documentation>
		</xsd:annotation>
	</xsd:element>
	<xsd:element name="Created" type="wsu:AttributedDateTime">
		<xsd:annotation>
			<xsd:documentation>
This element allows a creation time to be applied anywhere element wildcards are present.
            </xsd:documentation>
		</xsd:annotation>
	</xsd:element>
</xsd:schema>`,
};
