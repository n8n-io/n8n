import { createVerify, X509Certificate } from 'crypto';
const certificateCache = new Map();
export function clearCertificateCache() {
    certificateCache.clear();
}
const SIGNABLE_KEYS = [
    'Message',
    'MessageId',
    'Subject',
    'SubscribeURL',
    'Timestamp',
    'TopicArn',
    'Type',
];
const SIGNABLE_KEYS_SUBSCRIPTION = [
    'Message',
    'MessageId',
    'SubscribeURL',
    'Timestamp',
    'Token',
    'TopicArn',
    'Type',
];
export async function verifySignature(message, expectedTopicArn) {
    try {
        if (message.TopicArn !== expectedTopicArn || !hasSignatureFields(message)) {
            return false;
        }
        if (!isValidSigningCertUrl(message.SigningCertURL, message.TopicArn)) {
            return false;
        }
        const algorithm = getSignatureAlgorithm(message.SignatureVersion);
        if (!algorithm) {
            return false;
        }
        const certificate = await getCertificate.call(this, message.SigningCertURL);
        if (!certificate) {
            return false;
        }
        const stringToSign = buildStringToSign(message);
        const verifier = createVerify(algorithm);
        verifier.update(stringToSign, 'utf8');
        verifier.end();
        return verifier.verify(certificate.publicKey, Buffer.from(message.Signature, 'base64'));
    }
    catch {
        return false;
    }
}
function hasSignatureFields(message) {
    return (typeof message.TopicArn === 'string' &&
        typeof message.Signature === 'string' &&
        typeof message.SignatureVersion === 'string' &&
        typeof message.SigningCertURL === 'string');
}
function getSignatureAlgorithm(signatureVersion) {
    if (signatureVersion === '1') {
        return 'RSA-SHA1';
    }
    if (signatureVersion === '2') {
        return 'RSA-SHA256';
    }
    return null;
}
function buildStringToSign(message) {
    const keys = message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation'
        ? SIGNABLE_KEYS_SUBSCRIPTION
        : SIGNABLE_KEYS;
    let result = '';
    for (const key of keys) {
        if (key in message) {
            result += key + '\n' + String(message[key]) + '\n';
        }
    }
    return result;
}
function isValidSigningCertUrl(signingCertUrl, topicArn) {
    try {
        const url = new URL(signingCertUrl);
        const region = getRegionFromTopicArn(topicArn);
        if (!region) {
            return false;
        }
        const hostname = url.hostname.toLowerCase();
        const validHosts = [`sns.${region}.amazonaws.com`, `sns.${region}.amazonaws.com.cn`];
        return (url.protocol === 'https:' &&
            url.username === '' &&
            url.password === '' &&
            url.port === '' &&
            validHosts.includes(hostname) &&
            url.pathname.startsWith('/SimpleNotificationService-') &&
            url.pathname.endsWith('.pem'));
    }
    catch {
        return false;
    }
}
function getRegionFromTopicArn(topicArn) {
    const arnParts = topicArn.split(':');
    if (arnParts.length < 6 || arnParts[2] !== 'sns' || !arnParts[3]) {
        return null;
    }
    return arnParts[3];
}
async function getCertificate(signingCertUrl) {
    const cached = certificateCache.get(signingCertUrl);
    if (cached && isCertificateCurrentlyValid(cached)) {
        return cached;
    }
    certificateCache.delete(signingCertUrl);
    const certificate = await downloadCertificate.call(this, signingCertUrl);
    if (!certificate || !isCertificateCurrentlyValid(certificate)) {
        return null;
    }
    certificateCache.set(signingCertUrl, certificate);
    return certificate;
}
async function downloadCertificate(signingCertUrl) {
    const requestOptions = {
        method: 'GET',
        url: signingCertUrl,
        disableFollowRedirect: true,
        encoding: 'text',
        json: false,
    };
    const certificate = await this.helpers.httpRequest(requestOptions);
    if (typeof certificate !== 'string') {
        return null;
    }
    return new X509Certificate(certificate);
}
function isCertificateCurrentlyValid(certificate) {
    const now = Date.now();
    const validFrom = Date.parse(certificate.validFrom);
    const validTo = Date.parse(certificate.validTo);
    return !Number.isNaN(validFrom) && !Number.isNaN(validTo) && validFrom <= now && now <= validTo;
}
//# sourceMappingURL=AwsSnsTriggerHelpers.js.map