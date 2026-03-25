/*
 * Copyright 2018 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var ReceiverEvents;
(function (ReceiverEvents) {
    /**
     * @property {string} message Raised when a message is received.
     */
    ReceiverEvents['message'] = 'message';
    /**
     * @property {string} receiverOpen Raised when the remote peer indicates the link is
     * open (i.e. attached in AMQP parlance).
     */
    ReceiverEvents['receiverOpen'] = 'receiver_open';
    /**
     * @property {string} receiverDrained Raised when the remote peer
     * indicates that it has drained all credit (and therefore there
     * are no more messages at present that it can send).
     */
    ReceiverEvents['receiverDrained'] = 'receiver_drained';
    /**
     * @property {string} receiverFlow Raised when a flow is received for receiver.
     */
    ReceiverEvents['receiverFlow'] = 'receiver_flow';
    /**
     * @property {string} receiverError Raised when the remote peer
     * closes the receiver with an error. The context may also have an
     * error property giving some information about the reason for the
     * error.
     */
    ReceiverEvents['receiverError'] = 'receiver_error';
    /**
     * @property {string} receiverClose Raised when the remote peer indicates the link is closed.
     */
    ReceiverEvents['receiverClose'] = 'receiver_close';
    /**
     * @property {string} settled Raised when the receiver link receives a disposition.
     */
    ReceiverEvents['settled'] = 'settled';
})(ReceiverEvents || (ReceiverEvents = {}));

var SenderEvents;
(function (SenderEvents) {
    /**
     * @property {string} sendable Raised when the sender has sufficient credit to be able
     * to transmit messages to its peer.
     */
    SenderEvents['sendable'] = 'sendable';
    /**
     * @property {string} senderOpen Raised when the remote peer indicates the link is
     * open (i.e. attached in AMQP parlance).
     */
    SenderEvents['senderOpen'] = 'sender_open';
    /**
     * @property {string} senderDraining Raised when the remote peer
     * requests that the sender drain its credit; sending all
     * available messages within the credit limit and ensuring credit
     * is used up..
     */
    SenderEvents['senderDraining'] = 'sender_draining';
    /**
     * @property {string} senderFlow Raised when a flow is received for sender.
     */
    SenderEvents['senderFlow'] = 'sender_flow';
    /**
     * @property {string} senderError Raised when the remote peer
     * closes the sender with an error. The context may also have an
     * error property giving some information about the reason for the
     * error.
     */
    SenderEvents['senderError'] = 'sender_error';
    /**
     * @property {string} senderClose Raised when the remote peer indicates the link is closed.
     */
    SenderEvents['senderClose'] = 'sender_close';
    /**
     * @property {string} accepted Raised when a sent message is accepted by the peer.
     */
    SenderEvents['accepted'] = 'accepted';
    /**
     * @property {string} released Raised when a sent message is released by the peer.
     */
    SenderEvents['released'] = 'released';
    /**
     * @property {string} rejected Raised when a sent message is rejected by the peer.
     */
    SenderEvents['rejected'] = 'rejected';
    /**
     * @property {string} modified Raised when a sent message is modified by the peer.
     */
    SenderEvents['modified'] = 'modified';
    /**
     * @property {string} settled Raised when the sender link receives a disposition.
     */
    SenderEvents['settled'] = 'settled';
})(SenderEvents || (SenderEvents = {}));


var SessionEvents;
(function (SessionEvents) {
    /**
     * @property {string} sessionOpen Raised when the remote peer indicates the session is
     * open (i.e. attached in AMQP parlance).
     */
    SessionEvents['sessionOpen'] = 'session_open';
    /**
     * @property {string} sessionError Raised when the remote peer receives an error. The context
     * may also have an error property giving some information about the reason for the error.
     */
    SessionEvents['sessionError'] = 'session_error';
    /**
     * @property {string} sessionClose Raised when the remote peer indicates the session is closed.
     */
    SessionEvents['sessionClose'] = 'session_close';
    /**
     * @property {string} settled Raised when the session receives a disposition.
     */
    SessionEvents['settled'] = 'settled';
})(SessionEvents || (SessionEvents = {}));

var ConnectionEvents;
(function (ConnectionEvents) {
    /**
     * @property {string} connectionOpen Raised when the remote peer indicates the connection is open.
     */
    ConnectionEvents['connectionOpen'] = 'connection_open';
    /**
     * @property {string} connectionClose Raised when the remote peer indicates the connection is closed.
     */
    ConnectionEvents['connectionClose'] = 'connection_close';
    /**
     * @property {string} connectionError Raised when the remote peer indicates an error occurred on
     * the connection.
     */
    ConnectionEvents['connectionError'] = 'connection_error';
    /**
     * @property {string} protocolError Raised when a protocol error is received on the underlying socket.
     */
    ConnectionEvents['protocolError'] = 'protocol_error',
    /**
     * @property {string} error Raised when an error is received on the underlying socket.
     */
    ConnectionEvents['error'] = 'error',
    /**
     * @property {string} disconnected Raised when the underlying tcp connection is lost. The context
     * has a reconnecting property which is true if the library is attempting to automatically reconnect
     * and false if it has reached the reconnect limit. If reconnect has not been enabled or if the connection
     * is a tcp server, then the reconnecting property is undefined. The context may also have an error
     * property giving some information about the reason for the disconnect.
     */
    ConnectionEvents['disconnected'] = 'disconnected';
    /**
     * @property {string} settled Raised when the connection receives a disposition.
     */
    ConnectionEvents['settled'] = 'settled';
})(ConnectionEvents || (ConnectionEvents = {}));

module.exports = {
    ReceiverEvents: ReceiverEvents,
    SenderEvents: SenderEvents,
    SessionEvents: SessionEvents,
    ConnectionEvents: ConnectionEvents
};
