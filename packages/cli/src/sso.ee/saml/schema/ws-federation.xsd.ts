import type { XMLFileInfo } from 'xmllint-wasm';

export const xmlFileInfo: XMLFileInfo = {
	fileName: 'ws-federation.xsd',
	contents: `<?xml version="1.0" encoding="UTF-8" ?>
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
		   xmlns:sp='http://docs.oasis-open.org/ws-sx/ws-securitypolicy/200702'
		   xmlns:tns='http://docs.oasis-open.org/wsfed/federation/200706'
		   xmlns:wsa='http://www.w3.org/2005/08/addressing'
       xmlns:mex='http://schemas.xmlsoap.org/ws/2004/09/mex'
       xmlns:wsse='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
		   xmlns:wsu='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
       xmlns:md='urn:oasis:names:tc:SAML:2.0:metadata'
       xmlns:auth='http://docs.oasis-open.org/wsfed/authorization/200706'
		   targetNamespace='http://docs.oasis-open.org/wsfed/federation/200706'
		   elementFormDefault='qualified' >

  <xs:import namespace='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
			 schemaLocation='oasis-200401-wss-wssecurity-secext-1.0.xsd' />
  <xs:import namespace='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
			 schemaLocation='oasis-200401-wss-wssecurity-utility-1.0.xsd' />
  <xs:import namespace='http://www.w3.org/2005/08/addressing'
			 schemaLocation='ws-addr.xsd' />
  <xs:import namespace='http://schemas.xmlsoap.org/ws/2004/09/mex'
			 schemaLocation='MetadataExchange.xsd' />
  <xs:import namespace='urn:oasis:names:tc:SAML:2.0:metadata'
			 schemaLocation='saml-schema-metadata-2.0.xsd' />
  <xs:import namespace='http://docs.oasis-open.org/ws-sx/ws-securitypolicy/200702'
			 schemaLocation='ws-securitypolicy-1.2.xsd'/>
  <xs:import namespace='http://docs.oasis-open.org/wsfed/authorization/200706'
       schemaLocation='ws-authorization.xsd'/>

  <!-- Section 3.1 -->
  <!-- Note: Use of this root element is discouraged in favor of use of md:EntitiesDescriptor or md EntityDescriptor -->
  <xs:element name='FederationMetadata' type='tns:FederationMetadataType' />

  <xs:complexType name='FederationMetadataType' >
    <xs:sequence>
	  <!--
		  *** Accurate content model is nondeterministic ***
		  <xs:element name='Federation' type='tns:FederationType' minOccurs='1' maxOccurs='unbounded' />
		  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	  -->
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='FederationType' >
	<xs:sequence>
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:attribute name='FederationID' type='xs:anyURI' />
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 3.1.2.1 -->
  <xs:complexType name="WebServiceDescriptorType" abstract="true">
    <xs:complexContent>
      <xs:extension base="md:RoleDescriptorType">
        <xs:sequence>
          <xs:element ref="tns:LogicalServiceNamesOffered" minOccurs="0" maxOccurs="1" />
          <xs:element ref="tns:TokenTypesOffered" minOccurs="0" maxOccurs="1" />
          <xs:element ref="tns:ClaimDialectsOffered" minOccurs="0" maxOccurs="1" />
          <xs:element ref="tns:ClaimTypesOffered" minOccurs="0" maxOccurs="1" />
          <xs:element ref="tns:ClaimTypesRequested" minOccurs="0" maxOccurs="1" />
          <xs:element ref="tns:AutomaticPseudonyms" minOccurs="0" maxOccurs="1"/>
          <xs:element ref="tns:TargetScopes" minOccurs="0" maxOccurs="1"/>
        </xs:sequence>
        <xs:attribute name="ServiceDisplayName" type="xs:string" use="optional"/>
        <xs:attribute name="ServiceDescription" type="xs:string" use="optional"/>
    </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <xs:element name='LogicalServiceNamesOffered' type='tns:LogicalServiceNamesOfferedType' />
  <xs:element name='TokenTypesOffered' type='tns:TokenTypesOfferedType' />
  <xs:element name='ClaimDialectsOffered' type='tns:ClaimDialectsOfferedType' />
  <xs:element name='ClaimTypesOffered' type='tns:ClaimTypesOfferedType' />
  <xs:element name='ClaimTypesRequested' type='tns:ClaimTypesRequestedType' />
  <xs:element name="AutomaticPseudonyms" type="xs:boolean"/>
  <xs:element name='TargetScopes' type='tns:EndpointType'/>

  <!-- Section 3.1.2.2 -->
  <xs:complexType name="SecurityTokenServiceType">
    <xs:complexContent>
      <xs:extension base="tns:WebServiceDescriptorType">
        <xs:sequence>
          <xs:element ref="tns:SecurityTokenServiceEndpoint" minOccurs="1" maxOccurs="unbounded"/>
          <xs:element ref="tns:SingleSignOutSubscriptionEndpoint" minOccurs="0" maxOccurs="unbounded"/>
          <xs:element ref="tns:SingleSignOutNotificationEndpoint" minOccurs="0" maxOccurs="unbounded"/>
          <xs:element ref="tns:PassiveRequestorEndpoint" minOccurs="0" maxOccurs="unbounded"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
  <xs:element name="SecurityTokenServiceEndpoint" type="tns:EndpointType"/>
  <xs:element name="SingleSignOutSubscriptionEndpoint" type="tns:EndpointType"/>
  <xs:element name="SingleSignOutNotificationEndpoint" type="tns:EndpointType"/>
  <xs:element name="PassiveRequestorEndpoint" type="tns:EndpointType"/>

  <!-- Section 3.1.2.3 -->
  <xs:complexType name="PseudonymServiceType">
    <xs:complexContent>
      <xs:extension base="tns:WebServiceDescriptorType">
        <xs:sequence>
          <xs:element ref="tns:PseudonymServiceEndpoint" minOccurs="1" maxOccurs="unbounded"/>
          <xs:element ref="tns:SingleSignOutNotificationEndpoint" minOccurs="0" maxOccurs="unbounded"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <xs:element name="PseudonymServiceEndpoint" type="tns:EndpointType"/>
  <!-- Defined above -->
  <!-- <xs:element name="SingleSignOutNotificationEndpoint" type="tns:EndpointType"/> -->

  <!-- Section 3.1.2.4 -->
  <xs:complexType name="AttributeServiceType">
    <xs:complexContent>
      <xs:extension base="tns:WebServiceDescriptorType">
        <xs:sequence>
          <xs:element ref="tns:AttributeServiceEndpoint" minOccurs="1" maxOccurs="unbounded"/>
          <xs:element ref="tns:SingleSignOutNotificationEndpoint" minOccurs="0" maxOccurs="unbounded"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
  <xs:element name="AttributeServiceEndpoint" type="tns:EndpointType"/>
  <!-- Defined above -->
  <!-- <xs:element name="SingleSignOutNotificationEndpoint" type="tns:EndpointType"/> -->

  <!-- Section 3.1.2.5 -->
  <xs:complexType name="ApplicationServiceType">
    <xs:complexContent>
      <xs:extension base="tns:WebServiceDescriptorType">
        <xs:sequence>
          <xs:element ref="tns:ApplicationServiceEndpoint" minOccurs="1" maxOccurs="unbounded"/>
          <xs:element ref="tns:SingleSignOutNotificationEndpoint" minOccurs="0" maxOccurs="unbounded"/>
          <xs:element ref="tns:PassiveRequestorEndpoint" minOccurs="0" maxOccurs="unbounded"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
  <xs:element name="ApplicationServiceEndpoint" type="tns:EndpointType"/>
  <!-- Defined above -->
  <!-- <xs:element name="SingleSignOutNotificationEndpoint" type="tns:EndpointType"/> -->
  <!-- <xs:element name="PassiveRequestorEndpoint" type="tns:EndpointType"/> -->


  <!-- Section 3.1.3 -->
  <!-- Defined above -->
  <!--<xs:element name='LogicalServiceNamesOffered' type='tns:LogicalServiceNamesOfferedType' />-->

  <xs:complexType name='LogicalServiceNamesOfferedType' >
	<xs:sequence>
	  <xs:element name='IssuerName' type='tns:IssuerNameType' minOccurs='1' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='IssuerNameType' >
	<xs:attribute name='Uri' type='xs:anyURI' use='required' />
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>  
  
  <!-- Section 3.1.4 -->
  <xs:element name='PsuedonymServiceEndpoints' type='tns:EndpointType' />
  <xs:complexType name='EndpointType' >
    <xs:sequence>
      <xs:element ref='wsa:EndpointReference' minOccurs='1' maxOccurs='unbounded'/>
    </xs:sequence>
  </xs:complexType>
  
  <!-- Section 3.1.5 -->
  <xs:element name='AttributeServiceEndpoints' type='tns:EndpointType' />

  <!-- Section 3.1.6 -->
  <xs:element name='SingleSignOutSubscriptionEndpoints' type='tns:EndpointType' />

  <!-- Section 3.1.7 -->
  <xs:element name='SingleSignOutNotificationEndpoints' type='tns:EndpointType' />

  <!-- Section 3.1.8 -->
  <!-- Defined above -->
  <!--<xs:element name='TokenTypesOffered' type='tns:TokenTypesOfferedType' />-->
  <xs:complexType name='TokenTypesOfferedType' >
	<xs:sequence>
	  <xs:element name='TokenType' type='tns:TokenType' minOccurs='1' maxOccurs='unbounded' />
	  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='TokenType' >
	<xs:sequence>
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:attribute name='Uri' type='xs:anyURI' />
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 3.1.9 -->
  <!-- Defined above -->
  <!-- <xs:element name='ClaimTypesOffered' type='tns:ClaimTypesOfferedType' /> -->
  <xs:complexType name='ClaimTypesOfferedType'>
	<xs:sequence>
	  <xs:element ref='auth:ClaimType' minOccurs='1' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>
  
  <!-- Section 3.1.10 -->
  <!-- Defined above -->
  <!-- <xs:element name='ClaimTypesRequested' ype='tns:ClaimTypesRequestedType' /> -->
  <xs:complexType name='ClaimTypesRequestedType'>
    <xs:sequence>
      <xs:element ref='auth:ClaimType' minOccurs='1' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>
  
  <!-- Section 3.1.11 -->
  <!-- Defined above -->
  <!--<xs:element name='ClaimDialectsOffered' type='tns:ClaimDialectsOfferedType' />-->
  <xs:complexType name='ClaimDialectsOfferedType'>
    <xs:sequence>
      <xs:element name='ClaimDialect' type='tns:ClaimDialectType' minOccurs='1' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='ClaimDialectType' >
    <xs:sequence>
      <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
    </xs:sequence>
    <xs:attribute name='Uri' type='xs:anyURI' />
    <xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>
  
  <!-- Section 3.1.12 -->
  <!-- Defined above -->
  <!-- <xs:element name='AutomaticPseudonyms' type='xs:boolean' /> -->

  <!-- Section 3.1.13 -->
  <xs:element name='PassiveRequestorEnpoints' type='tns:EndpointType'/>
  
  <!-- Section 3.1.14 -->
  <!-- Defined above -->
  <!--<xs:element name='TargetScopes' type='tns:EndpointType'/>-->
  
  <!-- Section 3.2.4 -->
  <xs:element name='FederationMetadataHandler' type='tns:FederationMetadataHandlerType' />
  <xs:complexType name='FederationMetadataHandlerType' >
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 4.1 -->
  <xs:element name='SignOut' type='tns:SignOutType' />
  <xs:complexType name='SignOutType' >
	<xs:sequence>
	  <xs:element ref='tns:Realm' minOccurs='0' />
	  <xs:element name='SignOutBasis' type='tns:SignOutBasisType' minOccurs='1' maxOccurs='1' />
	  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:attribute ref='wsu:Id' use='optional' />
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:complexType name='SignOutBasisType' >
	<xs:sequence>
	  <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <!-- Section 4.2 -->
  <xs:element name='Realm' type='xs:anyURI' />

  <!-- Section 6.1 -->
  <xs:element name='FilterPseudonyms' type='tns:FilterPseudonymsType' />
  <xs:complexType name='FilterPseudonymsType' >
	<xs:sequence>
	  <xs:element ref='tns:PseudonymBasis' minOccurs='0' maxOccurs='1' />
	  <xs:element ref='tns:RelativeTo' minOccurs='0' maxOccurs='1' />
	  <xs:any namespace='##other' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <xs:element name='PseudonymBasis' type='tns:PseudonymBasisType' />
  <xs:complexType name='PseudonymBasisType' >
 	<xs:sequence>
	  <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='1' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:element name='RelativeTo' type='tns:RelativeToType' />
  <xs:complexType name='RelativeToType' >
	<xs:sequence>
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 6.2  -->
  <xs:element name='Pseudonym' type='tns:PseudonymType' />

  <xs:complexType name='PseudonymType' >
	<xs:sequence>
	  <!--
		  *** Accurate content model is nondeterministic ***
		  <xs:element ref='tns:PseudonymBasis' minOccurs='1' maxOccurs='1' /> 
		  <xs:element ref='tns:RelativeTo' minOccurs='1' maxOccurs='1' />
		  <xs:element ref='wsu:Expires' minOccurs='0' maxOccurs='1' />
		  <xs:element ref='tns:SecurityToken' minOccurs='0' maxOccurs='unbounded' />
		  <xs:element ref='tns:ProofToken' minOccurs='0' maxOccurs='unbounded' />
		  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />	  
	  -->

	  <xs:element ref='tns:PseudonymBasis' minOccurs='1' maxOccurs='1' /> 
	  <xs:element ref='tns:RelativeTo' minOccurs='1' maxOccurs='1' />
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />	  
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <xs:element name='SecurityToken' type='tns:SecurityTokenType' />
  <xs:complexType name='SecurityTokenType' >
 	<xs:sequence>
	  <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='1' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <xs:element name='ProofToken' type='tns:ProofTokenType' />
  <xs:complexType name='ProofTokenType' >
 	<xs:sequence>
	  <xs:any namespace='##other' processContents='lax' minOccurs='1' maxOccurs='1' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 7.1 -->
  <xs:element name='RequestPseudonym' type='tns:RequestPseudonymType' />
  <xs:complexType name='RequestPseudonymType' >
	<xs:sequence>
	  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />	  
	</xs:sequence>
	<xs:attribute name='SingleUse' type='xs:boolean' use='optional' />
	<xs:attribute name='Lookup' type='xs:boolean' use='optional' />
	<xs:anyAttribute namespace='##other' processContents='lax' />  
  </xs:complexType>

  <!-- Section 8.1 -->
  <xs:element name='ReferenceToken' type='tns:ReferenceTokenType' />
  <xs:complexType name='ReferenceTokenType'>
	<xs:sequence>
	  <xs:element name='ReferenceEPR' type='wsa:EndpointReferenceType' minOccurs='1' maxOccurs='unbounded' />
	  <xs:element name='ReferenceDigest' type='tns:ReferenceDigestType' minOccurs='0' maxOccurs='1' />
	  <xs:element name='ReferenceType' type='tns:AttributeExtensibleURI' minOccurs='0' maxOccurs='1' />
	  <xs:element name='SerialNo' type='tns:AttributeExtensibleURI' minOccurs='0' maxOccurs='1' />
	  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />	  	  
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />  
  </xs:complexType>

  <xs:complexType name='ReferenceDigestType' >
	<xs:simpleContent>
	  <xs:extension base='xs:base64Binary' >
		<xs:anyAttribute namespace='##other' processContents='lax' />  
	  </xs:extension>
	</xs:simpleContent>
  </xs:complexType>
  <xs:complexType name='AttributeExtensibleURI' >
    <xs:simpleContent>
      <xs:extension base='xs:anyURI' >
        <xs:anyAttribute namespace='##other' processContents='lax' />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  
  <!-- Section 8.2 -->
  <xs:element name='FederationID' type='tns:AttributeExtensibleURI' />

  <!-- Section 8.3 -->
  <xs:element name='RequestProofToken' type='tns:RequestProofTokenType' />
  <xs:complexType name='RequestProofTokenType' >
	<xs:sequence>
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 8.4 -->
  <xs:element name='ClientPseudonym' type='tns:ClientPseudonymType' />
  <xs:complexType name='ClientPseudonymType' >
	<xs:sequence>
	  <xs:element name='PPID' type='tns:AttributeExtensibleString' minOccurs='0' />
	  <xs:element name='DisplayName' type='tns:AttributeExtensibleString' minOccurs='0' />
	  <xs:element name='EMail' type='tns:AttributeExtensibleString' minOccurs='0' />
	  <xs:any namespace='##other' processContents='lax' minOccurs='0' maxOccurs='unbounded' />	  	  
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />	
  </xs:complexType>

  <xs:complexType name='AttributeExtensibleString' >
	<xs:simpleContent>
	  <xs:extension base='xs:string' >
		<xs:anyAttribute namespace='##other' processContents='lax' />
	  </xs:extension>
	</xs:simpleContent>
  </xs:complexType>

  <!-- Section 8.5 -->
  <xs:element name='Freshness' type='tns:Freshness' />
  <xs:complexType name='Freshness'>
	<xs:simpleContent>
	  <xs:extension base='xs:unsignedInt' >
		<xs:attribute name='AllowCache' type='xs:boolean' use='optional' />
		<xs:anyAttribute namespace='##other' processContents='lax' />		
	  </xs:extension>
	</xs:simpleContent>
  </xs:complexType>

  <!-- Section 14.1 -->
  <xs:element name='RequireReferenceToken' type='sp:TokenAssertionType' />
  <xs:element name='ReferenceToken11' type='tns:AssertionType' />

  <xs:complexType name='AssertionType' >
	<xs:sequence>
	  <xs:any namespace='##any' processContents='lax' minOccurs='0' maxOccurs='unbounded' />
	</xs:sequence>
	<xs:anyAttribute namespace='##other' processContents='lax' />
  </xs:complexType>

  <!-- Section 14.2 -->
  <xs:element name='WebBinding' type='sp:NestedPolicyType' />
  <xs:element name='AuthenticationToken' type='sp:NestedPolicyType' />
  <!-- ReferenceToken defined above -->
  <xs:element name='RequireSignedTokens' type='tns:AssertionType' />
  <xs:element name='RequireBearerTokens' type='tns:AssertionType' />
  <xs:element name='RequireSharedCookies' type='tns:AssertionType' />
  

  <!-- Section 14.3 -->
  <xs:element name='RequiresGenericClaimDialect' type='tns:AssertionType' />
  <xs:element name='IssuesSpecificPolicyFault' type='tns:AssertionType' />
  <xs:element name='AdditionalContextProcessed' type='tns:AssertionType' />


</xs:schema>`,
};
