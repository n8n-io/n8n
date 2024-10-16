export const xsdXmldsigCore = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE schema
  PUBLIC "-//W3C//DTD XMLSchema 200102//EN" "http://www.w3.org/2001/XMLSchema.dtd"
 [
   <!ATTLIST schema 
     xmlns:ds CDATA #FIXED "http://www.w3.org/2000/09/xmldsig#">
   <!ENTITY dsig 'http://www.w3.org/2000/09/xmldsig#'>
   <!ENTITY % p ''>
   <!ENTITY % s ''>
  ]>

<!-- Schema for XML Signatures
    http://www.w3.org/2000/09/xmldsig#
    $Revision: 1.1 $ on $Date: 2002/02/08 20:32:26 $ by $Author: reagle $

    Copyright 2001 The Internet Society and W3C (Massachusetts Institute
    of Technology, Institut National de Recherche en Informatique et en
    Automatique, Keio University). All Rights Reserved.
    http://www.w3.org/Consortium/Legal/

    This document is governed by the W3C Software License [1] as described
    in the FAQ [2].

    [1] http://www.w3.org/Consortium/Legal/copyright-software-19980720
    [2] http://www.w3.org/Consortium/Legal/IPR-FAQ-20000620.html#DTD
-->


<schema xmlns="http://www.w3.org/2001/XMLSchema"
        xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
        targetNamespace="http://www.w3.org/2000/09/xmldsig#"
        version="0.1" elementFormDefault="qualified"> 

<!-- Basic Types Defined for Signatures -->

<simpleType name="CryptoBinary">
  <restriction base="base64Binary">
  </restriction>
</simpleType>

<!-- Start Signature -->

<element name="Signature" type="ds:SignatureType"/>
<complexType name="SignatureType">
  <sequence> 
    <element ref="ds:SignedInfo"/> 
    <element ref="ds:SignatureValue"/> 
    <element ref="ds:KeyInfo" minOccurs="0"/> 
    <element ref="ds:Object" minOccurs="0" maxOccurs="unbounded"/> 
  </sequence>  
  <attribute name="Id" type="ID" use="optional"/>
</complexType>

  <element name="SignatureValue" type="ds:SignatureValueType"/> 
  <complexType name="SignatureValueType">
    <simpleContent>
      <extension base="base64Binary">
        <attribute name="Id" type="ID" use="optional"/>
      </extension>
    </simpleContent>
  </complexType>

<!-- Start SignedInfo -->

<element name="SignedInfo" type="ds:SignedInfoType"/>
<complexType name="SignedInfoType">
  <sequence> 
    <element ref="ds:CanonicalizationMethod"/> 
    <element ref="ds:SignatureMethod"/> 
    <element ref="ds:Reference" maxOccurs="unbounded"/> 
  </sequence>  
  <attribute name="Id" type="ID" use="optional"/> 
</complexType>

  <element name="CanonicalizationMethod" type="ds:CanonicalizationMethodType"/> 
  <complexType name="CanonicalizationMethodType" mixed="true">
    <sequence>
      <any namespace="##any" minOccurs="0" maxOccurs="unbounded"/>
      <!-- (0,unbounded) elements from (1,1) namespace -->
    </sequence>
    <attribute name="Algorithm" type="anyURI" use="required"/> 
  </complexType>

  <element name="SignatureMethod" type="ds:SignatureMethodType"/>
  <complexType name="SignatureMethodType" mixed="true">
    <sequence>
      <element name="HMACOutputLength" minOccurs="0" type="ds:HMACOutputLengthType"/>
      <any namespace="##other" minOccurs="0" maxOccurs="unbounded"/>
      <!-- (0,unbounded) elements from (1,1) external namespace -->
    </sequence>
    <attribute name="Algorithm" type="anyURI" use="required"/> 
  </complexType>

<!-- Start Reference -->

<element name="Reference" type="ds:ReferenceType"/>
<complexType name="ReferenceType">
  <sequence> 
    <element ref="ds:Transforms" minOccurs="0"/> 
    <element ref="ds:DigestMethod"/> 
    <element ref="ds:DigestValue"/> 
  </sequence>
  <attribute name="Id" type="ID" use="optional"/> 
  <attribute name="URI" type="anyURI" use="optional"/> 
  <attribute name="Type" type="anyURI" use="optional"/> 
</complexType>

  <element name="Transforms" type="ds:TransformsType"/>
  <complexType name="TransformsType">
    <sequence>
      <element ref="ds:Transform" maxOccurs="unbounded"/>  
    </sequence>
  </complexType>

  <element name="Transform" type="ds:TransformType"/>
  <complexType name="TransformType" mixed="true">
    <choice minOccurs="0" maxOccurs="unbounded"> 
      <any namespace="##other" processContents="lax"/>
      <!-- (1,1) elements from (0,unbounded) namespaces -->
      <element name="XPath" type="string"/> 
    </choice>
    <attribute name="Algorithm" type="anyURI" use="required"/> 
  </complexType>

<!-- End Reference -->

<element name="DigestMethod" type="ds:DigestMethodType"/>
<complexType name="DigestMethodType" mixed="true"> 
  <sequence>
    <any namespace="##other" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
  </sequence>    
  <attribute name="Algorithm" type="anyURI" use="required"/> 
</complexType>

<element name="DigestValue" type="ds:DigestValueType"/>
<simpleType name="DigestValueType">
  <restriction base="base64Binary"/>
</simpleType>

<!-- End SignedInfo -->

<!-- Start KeyInfo -->

<element name="KeyInfo" type="ds:KeyInfoType"/> 
<complexType name="KeyInfoType" mixed="true">
  <choice maxOccurs="unbounded">     
    <element ref="ds:KeyName"/> 
    <element ref="ds:KeyValue"/> 
    <element ref="ds:RetrievalMethod"/> 
    <element ref="ds:X509Data"/> 
    <element ref="ds:PGPData"/> 
    <element ref="ds:SPKIData"/>
    <element ref="ds:MgmtData"/>
    <any processContents="lax" namespace="##other"/>
    <!-- (1,1) elements from (0,unbounded) namespaces -->
  </choice>
  <attribute name="Id" type="ID" use="optional"/> 
</complexType>

  <element name="KeyName" type="string"/>
  <element name="MgmtData" type="string"/>

  <element name="KeyValue" type="ds:KeyValueType"/> 
  <complexType name="KeyValueType" mixed="true">
   <choice>
     <element ref="ds:DSAKeyValue"/>
     <element ref="ds:RSAKeyValue"/>
     <any namespace="##other" processContents="lax"/>
   </choice>
  </complexType>

  <element name="RetrievalMethod" type="ds:RetrievalMethodType"/> 
  <complexType name="RetrievalMethodType">
    <sequence>
      <element ref="ds:Transforms" minOccurs="0"/> 
    </sequence>  
    <attribute name="URI" type="anyURI"/>
    <attribute name="Type" type="anyURI" use="optional"/>
  </complexType>

<!-- Start X509Data -->

<element name="X509Data" type="ds:X509DataType"/> 
<complexType name="X509DataType">
  <sequence maxOccurs="unbounded">
    <choice>
      <element name="X509IssuerSerial" type="ds:X509IssuerSerialType"/>
      <element name="X509SKI" type="base64Binary"/>
      <element name="X509SubjectName" type="string"/>
      <element name="X509Certificate" type="base64Binary"/>
      <element name="X509CRL" type="base64Binary"/>
      <any namespace="##other" processContents="lax"/>
    </choice>
  </sequence>
</complexType>

<complexType name="X509IssuerSerialType"> 
  <sequence> 
    <element name="X509IssuerName" type="string"/> 
    <element name="X509SerialNumber" type="integer"/> 
  </sequence>
</complexType>

<!-- End X509Data -->

<!-- Begin PGPData -->

<element name="PGPData" type="ds:PGPDataType"/> 
<complexType name="PGPDataType"> 
  <choice>
    <sequence>
      <element name="PGPKeyID" type="base64Binary"/> 
      <element name="PGPKeyPacket" type="base64Binary" minOccurs="0"/> 
      <any namespace="##other" processContents="lax" minOccurs="0"
       maxOccurs="unbounded"/>
    </sequence>
    <sequence>
      <element name="PGPKeyPacket" type="base64Binary"/> 
      <any namespace="##other" processContents="lax" minOccurs="0"
       maxOccurs="unbounded"/>
    </sequence>
  </choice>
</complexType>

<!-- End PGPData -->

<!-- Begin SPKIData -->

<element name="SPKIData" type="ds:SPKIDataType"/> 
<complexType name="SPKIDataType">
  <sequence maxOccurs="unbounded">
    <element name="SPKISexp" type="base64Binary"/>
    <any namespace="##other" processContents="lax" minOccurs="0"/>
  </sequence>
</complexType> 

<!-- End SPKIData -->

<!-- End KeyInfo -->

<!-- Start Object (Manifest, SignatureProperty) -->

<element name="Object" type="ds:ObjectType"/> 
<complexType name="ObjectType" mixed="true">
  <sequence minOccurs="0" maxOccurs="unbounded">
    <any namespace="##any" processContents="lax"/>
  </sequence>
  <attribute name="Id" type="ID" use="optional"/> 
  <attribute name="MimeType" type="string" use="optional"/> <!-- add a grep facet -->
  <attribute name="Encoding" type="anyURI" use="optional"/> 
</complexType>

<element name="Manifest" type="ds:ManifestType"/> 
<complexType name="ManifestType">
  <sequence>
    <element ref="ds:Reference" maxOccurs="unbounded"/> 
  </sequence>
  <attribute name="Id" type="ID" use="optional"/> 
</complexType>

<element name="SignatureProperties" type="ds:SignaturePropertiesType"/> 
<complexType name="SignaturePropertiesType">
  <sequence>
    <element ref="ds:SignatureProperty" maxOccurs="unbounded"/> 
  </sequence>
  <attribute name="Id" type="ID" use="optional"/> 
</complexType>

   <element name="SignatureProperty" type="ds:SignaturePropertyType"/> 
   <complexType name="SignaturePropertyType" mixed="true">
     <choice maxOccurs="unbounded">
       <any namespace="##other" processContents="lax"/>
       <!-- (1,1) elements from (1,unbounded) namespaces -->
     </choice>
     <attribute name="Target" type="anyURI" use="required"/> 
     <attribute name="Id" type="ID" use="optional"/> 
   </complexType>

<!-- End Object (Manifest, SignatureProperty) -->

<!-- Start Algorithm Parameters -->

<simpleType name="HMACOutputLengthType">
  <restriction base="integer"/>
</simpleType>

<!-- Start KeyValue Element-types -->

<element name="DSAKeyValue" type="ds:DSAKeyValueType"/>
<complexType name="DSAKeyValueType">
  <sequence>
    <sequence minOccurs="0">
      <element name="P" type="ds:CryptoBinary"/>
      <element name="Q" type="ds:CryptoBinary"/>
    </sequence>
    <element name="G" type="ds:CryptoBinary" minOccurs="0"/>
    <element name="Y" type="ds:CryptoBinary"/>
    <element name="J" type="ds:CryptoBinary" minOccurs="0"/>
    <sequence minOccurs="0">
      <element name="Seed" type="ds:CryptoBinary"/>
      <element name="PgenCounter" type="ds:CryptoBinary"/>
    </sequence>
  </sequence>
</complexType>

<element name="RSAKeyValue" type="ds:RSAKeyValueType"/>
<complexType name="RSAKeyValueType">
  <sequence>
    <element name="Modulus" type="ds:CryptoBinary"/> 
    <element name="Exponent" type="ds:CryptoBinary"/> 
  </sequence>
</complexType> 

<!-- End KeyValue Element-types -->

<!-- End Signature -->

</schema>`;
