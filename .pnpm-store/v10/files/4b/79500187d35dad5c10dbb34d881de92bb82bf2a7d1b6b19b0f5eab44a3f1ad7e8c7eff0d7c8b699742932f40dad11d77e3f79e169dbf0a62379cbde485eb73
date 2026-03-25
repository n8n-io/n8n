/**
* @file urn.ts
* @author tngan
* @desc  Includes all keywords need in samlify
*/
export declare enum BindingNamespace {
    Redirect = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
    Post = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
    SimpleSign = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST-SimpleSign",
    Artifact = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact"
}
export declare enum MessageSignatureOrder {
    STE = "sign-then-encrypt",
    ETS = "encrypt-then-sign"
}
export declare enum StatusCode {
    Success = "urn:oasis:names:tc:SAML:2.0:status:Success",
    Requester = "urn:oasis:names:tc:SAML:2.0:status:Requester",
    Responder = "urn:oasis:names:tc:SAML:2.0:status:Responder",
    VersionMismatch = "urn:oasis:names:tc:SAML:2.0:status:VersionMismatch",
    AuthFailed = "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed",
    InvalidAttrNameOrValue = "urn:oasis:names:tc:SAML:2.0:status:InvalidAttrNameOrValue",
    InvalidNameIDPolicy = "urn:oasis:names:tc:SAML:2.0:status:InvalidNameIDPolicy",
    NoAuthnContext = "urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext",
    NoAvailableIDP = "urn:oasis:names:tc:SAML:2.0:status:NoAvailableIDP",
    NoPassive = "urn:oasis:names:tc:SAML:2.0:status:NoPassive",
    NoSupportedIDP = "urn:oasis:names:tc:SAML:2.0:status:NoSupportedIDP",
    PartialLogout = "urn:oasis:names:tc:SAML:2.0:status:PartialLogout",
    ProxyCountExceeded = "urn:oasis:names:tc:SAML:2.0:status:ProxyCountExceeded",
    RequestDenied = "urn:oasis:names:tc:SAML:2.0:status:RequestDenied",
    RequestUnsupported = "urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported",
    RequestVersionDeprecated = "urn:oasis:names:tc:SAML:2.0:status:RequestVersionDeprecated",
    RequestVersionTooHigh = "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooHigh",
    RequestVersionTooLow = "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooLow",
    ResourceNotRecognized = "urn:oasis:names:tc:SAML:2.0:status:ResourceNotRecognized",
    TooManyResponses = "urn:oasis:names:tc:SAML:2.0:status:TooManyResponses",
    UnknownAttrProfile = "urn:oasis:names:tc:SAML:2.0:status:UnknownAttrProfile",
    UnknownPrincipal = "urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal",
    UnsupportedBinding = "urn:oasis:names:tc:SAML:2.0:status:UnsupportedBinding"
}
declare const namespace: {
    binding: {
        redirect: string;
        post: string;
        simpleSign: string;
        artifact: string;
    };
    names: {
        protocol: string;
        assertion: string;
        metadata: string;
        userLogout: string;
        adminLogout: string;
    };
    authnContextClassRef: {
        password: string;
        passwordProtectedTransport: string;
    };
    format: {
        emailAddress: string;
        persistent: string;
        transient: string;
        entity: string;
        unspecified: string;
        kerberos: string;
        windowsDomainQualifiedName: string;
        x509SubjectName: string;
    };
    statusCode: {
        success: string;
        requester: string;
        responder: string;
        versionMismatch: string;
        authFailed: string;
        invalidAttrNameOrValue: string;
        invalidNameIDPolicy: string;
        noAuthnContext: string;
        noAvailableIDP: string;
        noPassive: string;
        noSupportedIDP: string;
        partialLogout: string;
        proxyCountExceeded: string;
        requestDenied: string;
        requestUnsupported: string;
        requestVersionDeprecated: string;
        requestVersionTooHigh: string;
        requestVersionTooLow: string;
        resourceNotRecognized: string;
        tooManyResponses: string;
        unknownAttrProfile: string;
        unknownPrincipal: string;
        unsupportedBinding: string;
    };
};
declare const tags: {
    request: {
        AllowCreate: string;
        AssertionConsumerServiceURL: string;
        AuthnContextClassRef: string;
        AssertionID: string;
        Audience: string;
        AuthnStatement: string;
        AttributeStatement: string;
        ConditionsNotBefore: string;
        ConditionsNotOnOrAfter: string;
        Destination: string;
        EntityID: string;
        ID: string;
        Issuer: string;
        IssueInstant: string;
        InResponseTo: string;
        NameID: string;
        NameIDFormat: string;
        ProtocolBinding: string;
        SessionIndex: string;
        SubjectRecipient: string;
        SubjectConfirmationDataNotOnOrAfter: string;
        StatusCode: string;
    };
    xmlTag: {
        loginRequest: string;
        logoutRequest: string;
        loginResponse: string;
        logoutResponse: string;
    };
};
declare const messageConfigurations: {
    signingOrder: {
        SIGN_THEN_ENCRYPT: string;
        ENCRYPT_THEN_SIGN: string;
    };
};
declare const algorithms: {
    signature: {
        RSA_SHA1: string;
        RSA_SHA256: string;
        RSA_SHA512: string;
    };
    encryption: {
        data: {
            AES_128: string;
            AES_256: string;
            TRI_DEC: string;
            AES_128_GCM: string;
        };
        key: {
            RSA_OAEP_MGF1P: string;
            RSA_1_5: string;
        };
    };
    digest: {
        'http://www.w3.org/2000/09/xmldsig#rsa-sha1': string;
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256': string;
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512': string;
    };
};
export declare enum ParserType {
    SAMLRequest = "SAMLRequest",
    SAMLResponse = "SAMLResponse",
    LogoutRequest = "LogoutRequest",
    LogoutResponse = "LogoutResponse"
}
declare const wording: {
    urlParams: {
        samlRequest: string;
        samlResponse: string;
        logoutRequest: string;
        logoutResponse: string;
        sigAlg: string;
        signature: string;
        relayState: string;
    };
    binding: {
        redirect: string;
        post: string;
        simpleSign: string;
        artifact: string;
    };
    certUse: {
        signing: string;
        encrypt: string;
    };
    metadata: {
        sp: string;
        idp: string;
    };
};
declare const elementsOrder: {
    default: string[];
    onelogin: string[];
    shibboleth: string[];
};
export { namespace, tags, algorithms, wording, elementsOrder, messageConfigurations };
