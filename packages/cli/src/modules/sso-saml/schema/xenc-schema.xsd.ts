import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'xenc-schema.xsd',
	contents: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE schema  PUBLIC "-//W3C//DTD XMLSchema 200102//EN"
 "http://www.w3.org/2001/XMLSchema.dtd"
 [
   <!ATTLIST schema
     xmlns:xenc CDATA #FIXED 'http://www.w3.org/2001/04/xmlenc#'
     xmlns:ds CDATA #FIXED 'http://www.w3.org/2000/09/xmldsig#'>
   <!ENTITY xenc 'http://www.w3.org/2001/04/xmlenc#'>
   <!ENTITY % p ''>
   <!ENTITY % s ''>
  ]>

<schema xmlns='http://www.w3.org/2001/XMLSchema' version='1.0'
        xmlns:xenc='http://www.w3.org/2001/04/xmlenc#'
        xmlns:ds='http://www.w3.org/2000/09/xmldsig#'
        targetNamespace='http://www.w3.org/2001/04/xmlenc#'
        elementFormDefault='qualified'>

  <import namespace='http://www.w3.org/2000/09/xmldsig#'
          schemaLocation='xmldsig-core-schema.xsd'/>

  <complexType name='EncryptedType' abstract='true'>
    <sequence>
      <element name='EncryptionMethod' type='xenc:EncryptionMethodType'
       minOccurs='0'/>
      <element ref='ds:KeyInfo' minOccurs='0'/>
      <element ref='xenc:CipherData'/>
      <element ref='xenc:EncryptionProperties' minOccurs='0'/>
    </sequence>
    <attribute name='Id' type='ID' use='optional'/>
    <attribute name='Type' type='anyURI' use='optional'/>
    <attribute name='MimeType' type='string' use='optional'/>
    <attribute name='Encoding' type='anyURI' use='optional'/>
  </complexType>
  
  <complexType name='EncryptionMethodType' mixed='true'>
    <sequence>
      <element name='KeySize' minOccurs='0' type='xenc:KeySizeType'/>
      <element name='OAEPparams' minOccurs='0' type='base64Binary'/>
      <any namespace='##other' minOccurs='0' maxOccurs='unbounded'/>
    </sequence>
    <attribute name='Algorithm' type='anyURI' use='required'/>
  </complexType>

    <simpleType name='KeySizeType'>
      <restriction base="integer"/>
    </simpleType>

  <element name='CipherData' type='xenc:CipherDataType'/>
  <complexType name='CipherDataType'>
     <choice>
       <element name='CipherValue' type='base64Binary'/>
       <element ref='xenc:CipherReference'/>
     </choice>
    </complexType>

   <element name='CipherReference' type='xenc:CipherReferenceType'/>
   <complexType name='CipherReferenceType'>
       <choice>
         <element name='Transforms' type='xenc:TransformsType' minOccurs='0'/>
       </choice>
       <attribute name='URI' type='anyURI' use='required'/>
   </complexType>

     <complexType name='TransformsType'>
       <sequence>
         <element ref='ds:Transform' maxOccurs='unbounded'/>
       </sequence>
     </complexType>


  <element name='EncryptedData' type='xenc:EncryptedDataType'/>
  <complexType name='EncryptedDataType'>
    <complexContent>
      <extension base='xenc:EncryptedType'>
       </extension>
    </complexContent>
  </complexType>

  <!-- Children of ds:KeyInfo -->

  <element name='EncryptedKey' type='xenc:EncryptedKeyType'/>
  <complexType name='EncryptedKeyType'>
    <complexContent>
      <extension base='xenc:EncryptedType'>
        <sequence>
          <element ref='xenc:ReferenceList' minOccurs='0'/>
          <element name='CarriedKeyName' type='string' minOccurs='0'/>
        </sequence>
        <attribute name='Recipient' type='string'
         use='optional'/>
      </extension>
    </complexContent>
  </complexType>

    <element name="AgreementMethod" type="xenc:AgreementMethodType"/>
    <complexType name="AgreementMethodType" mixed="true">
      <sequence>
        <element name="KA-Nonce" minOccurs="0" type="base64Binary"/>
        <!-- <element ref="ds:DigestMethod" minOccurs="0"/> -->
        <any namespace="##other" minOccurs="0" maxOccurs="unbounded"/>
        <element name="OriginatorKeyInfo" minOccurs="0" type="ds:KeyInfoType"/>
        <element name="RecipientKeyInfo" minOccurs="0" type="ds:KeyInfoType"/>
      </sequence>
      <attribute name="Algorithm" type="anyURI" use="required"/>
    </complexType>

  <!-- End Children of ds:KeyInfo -->

  <element name='ReferenceList'>
    <complexType>
      <choice minOccurs='1' maxOccurs='unbounded'>
        <element name='DataReference' type='xenc:ReferenceType'/>
        <element name='KeyReference' type='xenc:ReferenceType'/>
      </choice>
    </complexType>
  </element>

  <complexType name='ReferenceType'>
    <sequence>
      <any namespace='##other' minOccurs='0' maxOccurs='unbounded'/>
    </sequence>
    <attribute name='URI' type='anyURI' use='required'/>
  </complexType>


  <element name='EncryptionProperties' type='xenc:EncryptionPropertiesType'/>
  <complexType name='EncryptionPropertiesType'>
    <sequence>
      <element ref='xenc:EncryptionProperty' maxOccurs='unbounded'/>
    </sequence>
    <attribute name='Id' type='ID' use='optional'/>
  </complexType>

    <element name='EncryptionProperty' type='xenc:EncryptionPropertyType'/>
    <complexType name='EncryptionPropertyType' mixed='true'>
      <choice maxOccurs='unbounded'>
        <any namespace='##other' processContents='lax'/>
      </choice>
      <attribute name='Target' type='anyURI' use='optional'/>
      <attribute name='Id' type='ID' use='optional'/>
      <anyAttribute namespace="http://www.w3.org/XML/1998/namespace"/>
    </complexType>

</schema>`,
};
