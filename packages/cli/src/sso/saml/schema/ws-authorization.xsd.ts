import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'ws-authorization.xsd',
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

<xs:schema xmlns:xs='http://www.w3.org/2001/XMLSchema'
       xmlns:xenc='http://www.w3.org/2001/04/xmlenc#'    
		   xmlns:tns='http://docs.oasis-open.org/wsfed/authorization/200706'
		   targetNamespace='http://docs.oasis-open.org/wsfed/authorization/200706'
		   elementFormDefault='qualified' >
  <xs:import namespace='http://www.w3.org/2001/04/xmlenc#'
             schemaLocation='xenc-schema.xsd'/>
  
  <!-- Section 9.2 -->
  <xs:element name='AdditionalContext' type='tns:AdditionalContextType' />
  <xs:complexType name='AdditionalContextType' >
    <xs:sequence>
      <xs:element name='ContextItem' type='tns:ContextItemType' minOccurs='0' maxOccurs='unbounded' />
      <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='ContextItemType' >
    <xs:choice minOccurs='0'>
      <xs:element name='Value' type='xs:string' minOccurs='1' maxOccurs='1' />
      <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='1' />
    </xs:choice>
    <xs:attribute name='Name' type='xs:anyURI' use='required' />
	<xs:attribute name='Scope' type='xs:anyURI' use='optional' />
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <!-- Section 9.3 -->
  <xs:element name='ClaimType' type='tns:ClaimType' />
  <xs:complexType name='ClaimType' >
    <xs:sequence>
      <xs:element name="DisplayName" type="tns:DisplayNameType" minOccurs="0" maxOccurs="1" />
      <xs:element name="Description" type="tns:DescriptionType" minOccurs="0" maxOccurs="1" />
      <xs:element name="DisplayValue" type="tns:DisplayValueType" minOccurs="0" maxOccurs="1" />
      <xs:choice minOccurs='0'>
	      <xs:element name='Value' type='xs:string' minOccurs='1' maxOccurs='1' />
        <xs:element name='EncryptedValue' type='tns:EncryptedValueType' minOccurs='1' maxOccurs='1' />
        <xs:element name='StructuredValue' type='tns:StructuredValueType' minOccurs='1' maxOccurs='1' />
        <xs:element name='ConstrainedValue' type='tns:ConstrainedValueType' minOccurs='1' maxOccurs='1' />
 	      <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='1' />
	    </xs:choice>
    </xs:sequence>
	<xs:attribute name='Uri' type='xs:anyURI' use='required' />
	<xs:attribute name='Optional' type='xs:boolean' use='optional' />
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <xs:complexType name="DisplayNameType">
    <xs:simpleContent>
     <xs:extension base="xs:string">
        <xs:anyAttribute namespace="##other" processContents="lax" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  <xs:complexType name="DescriptionType">
    <xs:simpleContent>
      <xs:extension base="xs:string">
        <xs:anyAttribute namespace="##other" processContents="lax" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  <xs:complexType name="DisplayValueType">
    <xs:simpleContent>
      <xs:extension base="xs:string">
        <xs:anyAttribute namespace="##other" processContents="lax" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>

  <xs:complexType name="EncryptedValueType">
    <xs:sequence>
      <xs:element ref="xenc:EncryptedData" minOccurs="1" maxOccurs="1"/>
    </xs:sequence>
    <xs:attribute name="DecryptionCondition" type="xs:anyURI" use="optional"/>
  </xs:complexType>

  <xs:complexType name="StructuredValueType">
    <xs:sequence>
      <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 9.3.1 -->

  <xs:complexType name='ConstrainedValueType'>
    <xs:sequence>
      <xs:choice minOccurs='1'>
        <xs:element name='ValueLessThan' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
        <xs:element name='ValueLessThanOrEqual' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
        <xs:element name='ValueGreaterThan' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
        <xs:element name='ValueGreaterThanOrEqual' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
        <xs:element name='ValueInRangen' type='tns:ValueInRangeType' minOccurs='1' maxOccurs='1'/>
        <xs:element name='ValueOneOf' type='tns:ConstrainedManyValueType' minOccurs='1' maxOccurs='1'/>
      </xs:choice>
      <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:attribute name='AssertConstraint' type='xs:boolean' use='optional' />
  </xs:complexType>
  <xs:complexType name='ValueInRangeType'>
    <xs:sequence>
      <xs:element name='ValueUpperBound' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
      <xs:element name='ValueLowerBound' type='tns:ConstrainedSingleValueType' minOccurs='1' maxOccurs='1'/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name='ConstrainedSingleValueType'>
    <xs:choice minOccurs='0'>
      <xs:element name='Value' type='xs:string' minOccurs='1' maxOccurs='1' />
      <xs:element name='StructuredValue' type='tns:StructuredValueType' minOccurs='1' maxOccurs='1' />
    </xs:choice>
  </xs:complexType>

  <xs:complexType name='ConstrainedManyValueType'>
    <xs:choice minOccurs='0'>
      <xs:element name='Value' type='xs:string' minOccurs='1' maxOccurs='unbounded' />
      <xs:element name='StructuredValue' type='tns:StructuredValueType' minOccurs='1' maxOccurs='unbounded' />
    </xs:choice>
  </xs:complexType>

</xs:schema>`,
};
