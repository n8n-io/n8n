"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvelopedSignature = void 0;
const xpath = require("xpath");
const isDomNode = require("@xmldom/is-dom-node");
class EnvelopedSignature {
    constructor() {
        this.includeComments = false;
        this.includeComments = false;
    }
    process(node, options) {
        if (null == options.signatureNode) {
            const signature = xpath.select1("./*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']", node);
            if (isDomNode.isNodeLike(signature) && signature.parentNode) {
                signature.parentNode.removeChild(signature);
            }
            return node;
        }
        const signatureNode = options.signatureNode;
        const expectedSignatureValue = xpath.select1(".//*[local-name(.)='SignatureValue']/text()", signatureNode);
        if (isDomNode.isTextNode(expectedSignatureValue)) {
            const expectedSignatureValueData = expectedSignatureValue.data;
            const signatures = xpath.select(".//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']", node);
            for (const nodeSignature of Array.isArray(signatures) ? signatures : []) {
                const signatureValue = xpath.select1(".//*[local-name(.)='SignatureValue']/text()", nodeSignature);
                if (isDomNode.isTextNode(signatureValue)) {
                    const signatureValueData = signatureValue.data;
                    if (expectedSignatureValueData === signatureValueData) {
                        if (nodeSignature.parentNode) {
                            nodeSignature.parentNode.removeChild(nodeSignature);
                        }
                    }
                }
            }
        }
        return node;
    }
    getAlgorithmName() {
        return "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
    }
}
exports.EnvelopedSignature = EnvelopedSignature;
//# sourceMappingURL=enveloped-signature.js.map