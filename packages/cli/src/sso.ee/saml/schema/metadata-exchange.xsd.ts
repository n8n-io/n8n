import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'MetadataExchange.xsd',
	contents: `<?xml version='1.0' encoding='UTF-8' ?>
<!--
(c) 2004-2006 BEA Systems Inc., Computer Associates International, Inc.,
International Business Machines Corporation, Microsoft Corporation,
Inc., SAP AG, Sun Microsystems, and webMethods. All rights reserved. 

Permission to copy and display the WS-MetadataExchange Specification
(the "Specification"), in any medium without fee or royalty is hereby
granted, provided that you include the following on ALL copies of the
Specification that you make:

1.	A link or URL to the Specification at this location.
2.	The copyright notice as shown in the Specification.

BEA Systems, Computer Associates, IBM, Microsoft, SAP, Sun, and
webMethods (collectively, the "Authors") each agree to grant you a
license, under royalty-free and otherwise reasonable,
non-discriminatory terms and conditions, to their respective essential
patent claims that they deem necessary to implement the
WS-MetadataExchange Specification.

THE SPECIFICATION IS PROVIDED "AS IS," AND THE AUTHORS MAKE NO
REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT
LIMITED TO, WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE, NON-INFRINGEMENT, OR TITLE; THAT THE CONTENTS OF THE
SPECIFICATION ARE SUITABLE FOR ANY PURPOSE; NOR THAT THE
IMPLEMENTATION OF SUCH CONTENTS WILL NOT INFRINGE ANY THIRD PARTY
PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

THE AUTHORS WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL,
INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR RELATING TO ANY
USE OR DISTRIBUTION OF THE SPECIFICATIONS.

The name and trademarks of the Authors may NOT be used in any manner,
including advertising or publicity pertaining to the Specifications or
their contents without specific, written prior permission. Title to
copyright in the Specifications will at all times remain with the
Authors.

No other rights are granted by implication, estoppel or otherwise.
-->

<xs:schema
    targetNamespace='http://schemas.xmlsoap.org/ws/2004/09/mex'
    xmlns:tns='http://schemas.xmlsoap.org/ws/2004/09/mex'
    xmlns:wsa10='http://www.w3.org/2005/08/addressing'
    xmlns:wsa04='http://schemas.xmlsoap.org/ws/2004/08/addressing'
    xmlns:xs='http://www.w3.org/2001/XMLSchema'
    elementFormDefault='qualified'
    blockDefault='#all' >

  <!-- Get Metadata request -->
  <xs:element name='GetMetadata' >
    <xs:complexType>
      <xs:sequence>
        <xs:element ref='tns:Dialect' minOccurs='0' />
        <xs:element ref='tns:Identifier' minOccurs='0' />
      </xs:sequence>
      <xs:anyAttribute namespace='##other' processContents='lax' />
    </xs:complexType>
  </xs:element>

  <xs:element name='Dialect' type='xs:anyURI' />
  <xs:element name='Identifier' type='xs:anyURI' />

  <!-- Get Metadata response -->
  <xs:element name='Metadata' >
    <xs:complexType>
      <xs:sequence>
        <xs:element ref='tns:MetadataSection'
                    minOccurs='0'
                    maxOccurs='unbounded' />
        <xs:any namespace='##other' processContents='lax'
                minOccurs='0'
                maxOccurs='unbounded' />
      </xs:sequence>
      <xs:anyAttribute namespace='##other' processContents='lax' />
    </xs:complexType>
  </xs:element>

  <xs:element name='MetadataSection' >
    <xs:complexType>
      <xs:choice>
        <xs:any namespace='##other' processContents='lax' />
        <xs:element ref='tns:MetadataReference' />
        <xs:element ref='tns:Location' />
      </xs:choice>
      <xs:attribute name='Dialect' type='xs:anyURI' use='required' />
      <xs:attribute name='Identifier' type='xs:anyURI' />
      <xs:anyAttribute namespace='##other' processContents='lax' />
    </xs:complexType>
  </xs:element>
  
  <!-- 
       Ideally, the type of the MetadataReference would have been
       the union of wsa04:EndpointReferenceType and
       wsa10:EndpointReferenceType but unfortunately xs:union only
       works for simple types. As a result, we have to define
       the mex:MetadataReference using xs:any.
  -->

  <xs:element name='MetadataReference'>
    <xs:complexType>
      <xs:sequence>
        <xs:any minOccurs='1' maxOccurs='unbounded' 
                processContents='lax' namespace='##other' />
      </xs:sequence>
    </xs:complexType>
  </xs:element>
  <xs:element name='Location'
              type='xs:anyURI' />
</xs:schema>`,
};
