'use strict';

const EventEmitter = require('events');
const packageData = require('../../package.json');
const shared = require('../shared');
const LeWindows = require('../mime-node/le-windows');
const MimeNode = require('../mime-node');

/**
 * Generates a Transport object for AWS SES
 *
 * @constructor
 * @param {Object} optional config parameter
 */
class SESTransport extends EventEmitter {
    constructor(options) {
        super();
        options = options || {};

        this.options = options || {};
        this.ses = this.options.SES;

        this.name = 'SESTransport';
        this.version = packageData.version;

        this.logger = shared.getLogger(this.options, {
            component: this.options.component || 'ses-transport'
        });
    }

    getRegion(cb) {
        if (this.ses.sesClient.config && typeof this.ses.sesClient.config.region === 'function') {
            // promise
            return this.ses.sesClient.config
                .region()
                .then(region => cb(null, region))
                .catch(err => cb(err));
        }
        return cb(null, false);
    }

    /**
     * Compiles a mailcomposer message and forwards it to SES
     *
     * @param {Object} emailMessage MailComposer object
     * @param {Function} callback Callback function to run when the sending is completed
     */
    send(mail, callback) {
        let statObject = {
            ts: Date.now(),
            pending: true
        };

        let fromHeader = mail.message._headers.find(header => /^from$/i.test(header.key));
        if (fromHeader) {
            let mimeNode = new MimeNode('text/plain');
            fromHeader = mimeNode._convertAddresses(mimeNode._parseAddresses(fromHeader.value));
        }

        let envelope = mail.data.envelope || mail.message.getEnvelope();
        let messageId = mail.message.messageId();

        let recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
            recipients.push('...and ' + recipients.splice(2).length + ' more');
        }
        this.logger.info(
            {
                tnx: 'send',
                messageId
            },
            'Sending message %s to <%s>',
            messageId,
            recipients.join(', ')
        );

        let getRawMessage = next => {
            // do not use Message-ID and Date in DKIM signature
            if (!mail.data._dkim) {
                mail.data._dkim = {};
            }
            if (mail.data._dkim.skipFields && typeof mail.data._dkim.skipFields === 'string') {
                mail.data._dkim.skipFields += ':date:message-id';
            } else {
                mail.data._dkim.skipFields = 'date:message-id';
            }

            let sourceStream = mail.message.createReadStream();
            let stream = sourceStream.pipe(new LeWindows());
            let chunks = [];
            let chunklen = 0;

            stream.on('readable', () => {
                let chunk;
                while ((chunk = stream.read()) !== null) {
                    chunks.push(chunk);
                    chunklen += chunk.length;
                }
            });

            sourceStream.once('error', err => stream.emit('error', err));

            stream.once('error', err => {
                next(err);
            });

            stream.once('end', () => next(null, Buffer.concat(chunks, chunklen)));
        };

        setImmediate(() =>
            getRawMessage((err, raw) => {
                if (err) {
                    this.logger.error(
                        {
                            err,
                            tnx: 'send',
                            messageId
                        },
                        'Failed creating message for %s. %s',
                        messageId,
                        err.message
                    );
                    statObject.pending = false;
                    return callback(err);
                }

                let sesMessage = {
                    Content: {
                        Raw: {
                            // required
                            Data: raw // required
                        }
                    },
                    FromEmailAddress: fromHeader ? fromHeader : envelope.from,
                    Destination: {
                        ToAddresses: envelope.to
                    }
                };

                Object.keys(mail.data.ses || {}).forEach(key => {
                    sesMessage[key] = mail.data.ses[key];
                });

                this.getRegion((err, region) => {
                    if (err || !region) {
                        region = 'us-east-1';
                    }

                    const command = new this.ses.SendEmailCommand(sesMessage);
                    const sendPromise = this.ses.sesClient.send(command);

                    sendPromise
                        .then(data => {
                            if (region === 'us-east-1') {
                                region = 'email';
                            }

                            statObject.pending = true;
                            callback(null, {
                                envelope: {
                                    from: envelope.from,
                                    to: envelope.to
                                },
                                messageId: '<' + data.MessageId + (!/@/.test(data.MessageId) ? '@' + region + '.amazonses.com' : '') + '>',
                                response: data.MessageId,
                                raw
                            });
                        })
                        .catch(err => {
                            this.logger.error(
                                {
                                    err,
                                    tnx: 'send'
                                },
                                'Send error for %s: %s',
                                messageId,
                                err.message
                            );
                            statObject.pending = false;
                            callback(err);
                        });
                });
            })
        );
    }

    /**
     * Verifies SES configuration
     *
     * @param {Function} callback Callback function
     */
    verify(callback) {
        let promise;
        if (!callback) {
            promise = new Promise((resolve, reject) => {
                callback = shared.callbackPromise(resolve, reject);
            });
        }

        const cb = err => {
            if (err && !['InvalidParameterValue', 'MessageRejected'].includes(err.code || err.Code || err.name)) {
                return callback(err);
            }
            return callback(null, true);
        };

        const sesMessage = {
            Content: {
                Raw: {
                    Data: Buffer.from('From: <invalid@invalid>\r\nTo: <invalid@invalid>\r\n Subject: Invalid\r\n\r\nInvalid')
                }
            },
            FromEmailAddress: 'invalid@invalid',
            Destination: {
                ToAddresses: ['invalid@invalid']
            }
        };

        this.getRegion((err, region) => {
            if (err || !region) {
                region = 'us-east-1';
            }

            const command = new this.ses.SendEmailCommand(sesMessage);
            const sendPromise = this.ses.sesClient.send(command);

            sendPromise.then(data => cb(null, data)).catch(err => cb(err));
        });

        return promise;
    }
}

module.exports = SESTransport;
