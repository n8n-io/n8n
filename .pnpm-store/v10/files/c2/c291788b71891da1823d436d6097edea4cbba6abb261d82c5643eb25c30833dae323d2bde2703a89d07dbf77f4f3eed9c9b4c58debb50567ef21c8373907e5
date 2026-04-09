import Connection from '../connection';
import Request from '../request';
import { RequestError } from '../errors';
import { BeginTransactionEnvChangeToken, CharsetEnvChangeToken, CollationChangeToken, ColMetadataToken, CommitTransactionEnvChangeToken, DatabaseEnvChangeToken, DatabaseMirroringPartnerEnvChangeToken, DoneInProcToken, DoneProcToken, DoneToken, ErrorMessageToken, FeatureExtAckToken, FedAuthInfoToken, InfoMessageToken, LanguageEnvChangeToken, LoginAckToken, NBCRowToken, OrderToken, PacketSizeEnvChangeToken, ResetConnectionEnvChangeToken, ReturnStatusToken, ReturnValueToken, RollbackTransactionEnvChangeToken, RoutingEnvChangeToken, RowToken, SSPIToken, Token } from './token';
import BulkLoad from '../bulk-load';
export declare class UnexpectedTokenError extends Error {
    constructor(handler: TokenHandler, token: Token);
}
export declare class TokenHandler {
    onInfoMessage(token: InfoMessageToken): void;
    onErrorMessage(token: ErrorMessageToken): void;
    onSSPI(token: SSPIToken): void;
    onDatabaseChange(token: DatabaseEnvChangeToken): void;
    onLanguageChange(token: LanguageEnvChangeToken): void;
    onCharsetChange(token: CharsetEnvChangeToken): void;
    onSqlCollationChange(token: CollationChangeToken): void;
    onRoutingChange(token: RoutingEnvChangeToken): void;
    onPacketSizeChange(token: PacketSizeEnvChangeToken): void;
    onResetConnection(token: ResetConnectionEnvChangeToken): void;
    onBeginTransaction(token: BeginTransactionEnvChangeToken): void;
    onCommitTransaction(token: CommitTransactionEnvChangeToken): void;
    onRollbackTransaction(token: RollbackTransactionEnvChangeToken): void;
    onFedAuthInfo(token: FedAuthInfoToken): void;
    onFeatureExtAck(token: FeatureExtAckToken): void;
    onLoginAck(token: LoginAckToken): void;
    onColMetadata(token: ColMetadataToken): void;
    onOrder(token: OrderToken): void;
    onRow(token: RowToken | NBCRowToken): void;
    onReturnStatus(token: ReturnStatusToken): void;
    onReturnValue(token: ReturnValueToken): void;
    onDoneProc(token: DoneProcToken): void;
    onDoneInProc(token: DoneInProcToken): void;
    onDone(token: DoneToken): void;
    onDatabaseMirroringPartner(token: DatabaseMirroringPartnerEnvChangeToken): void;
}
/**
 * A handler for tokens received in the response message to the initial SQL Batch request
 * that sets up different connection settings.
 */
export declare class InitialSqlTokenHandler extends TokenHandler {
    connection: Connection;
    constructor(connection: Connection);
    onInfoMessage(token: InfoMessageToken): void;
    onErrorMessage(token: ErrorMessageToken): void;
    onDatabaseChange(token: DatabaseEnvChangeToken): void;
    onLanguageChange(token: LanguageEnvChangeToken): void;
    onCharsetChange(token: CharsetEnvChangeToken): void;
    onSqlCollationChange(token: CollationChangeToken): void;
    onPacketSizeChange(token: PacketSizeEnvChangeToken): void;
    onBeginTransaction(token: BeginTransactionEnvChangeToken): void;
    onCommitTransaction(token: CommitTransactionEnvChangeToken): void;
    onRollbackTransaction(token: RollbackTransactionEnvChangeToken): void;
    onColMetadata(token: ColMetadataToken): void;
    onOrder(token: OrderToken): void;
    onRow(token: RowToken | NBCRowToken): void;
    onReturnStatus(token: ReturnStatusToken): void;
    onReturnValue(token: ReturnValueToken): void;
    onDoneProc(token: DoneProcToken): void;
    onDoneInProc(token: DoneInProcToken): void;
    onDone(token: DoneToken): void;
    onResetConnection(token: ResetConnectionEnvChangeToken): void;
}
/**
 * A handler for tokens received in the response message to a Login7 message.
 */
export declare class Login7TokenHandler extends TokenHandler {
    connection: Connection;
    fedAuthInfoToken: FedAuthInfoToken | undefined;
    routingData: {
        server: string;
        port: number;
        instance: string;
    } | undefined;
    loginAckReceived: boolean;
    constructor(connection: Connection);
    onInfoMessage(token: InfoMessageToken): void;
    onErrorMessage(token: ErrorMessageToken): void;
    onSSPI(token: SSPIToken): void;
    onDatabaseChange(token: DatabaseEnvChangeToken): void;
    onDatabaseMirroringPartner(token: DatabaseMirroringPartnerEnvChangeToken): void;
    onLanguageChange(token: LanguageEnvChangeToken): void;
    onCharsetChange(token: CharsetEnvChangeToken): void;
    onSqlCollationChange(token: CollationChangeToken): void;
    onFedAuthInfo(token: FedAuthInfoToken): void;
    onFeatureExtAck(token: FeatureExtAckToken): void;
    onLoginAck(token: LoginAckToken): void;
    onRoutingChange(token: RoutingEnvChangeToken): void;
    onDoneInProc(token: DoneInProcToken): void;
    onDone(token: DoneToken): void;
    onPacketSizeChange(token: PacketSizeEnvChangeToken): void;
}
/**
 * A handler for tokens received in the response message to a RPC Request,
 * a SQL Batch Request, a Bulk Load BCP Request or a Transaction Manager Request.
 */
export declare class RequestTokenHandler extends TokenHandler {
    connection: Connection;
    request: Request | BulkLoad;
    errors: RequestError[];
    constructor(connection: Connection, request: Request | BulkLoad);
    onInfoMessage(token: InfoMessageToken): void;
    onErrorMessage(token: ErrorMessageToken): void;
    onDatabaseChange(token: DatabaseEnvChangeToken): void;
    onLanguageChange(token: LanguageEnvChangeToken): void;
    onCharsetChange(token: CharsetEnvChangeToken): void;
    onSqlCollationChange(token: CollationChangeToken): void;
    onPacketSizeChange(token: PacketSizeEnvChangeToken): void;
    onBeginTransaction(token: BeginTransactionEnvChangeToken): void;
    onCommitTransaction(token: CommitTransactionEnvChangeToken): void;
    onRollbackTransaction(token: RollbackTransactionEnvChangeToken): void;
    onColMetadata(token: ColMetadataToken): void;
    onOrder(token: OrderToken): void;
    onRow(token: RowToken | NBCRowToken): void;
    onReturnStatus(token: ReturnStatusToken): void;
    onReturnValue(token: ReturnValueToken): void;
    onDoneProc(token: DoneProcToken): void;
    onDoneInProc(token: DoneInProcToken): void;
    onDone(token: DoneToken): void;
    onResetConnection(token: ResetConnectionEnvChangeToken): void;
}
/**
 * A handler for the attention acknowledgement message.
 *
 * This message only contains a `DONE` token that acknowledges
 * that the attention message was received by the server.
 */
export declare class AttentionTokenHandler extends TokenHandler {
    connection: Connection;
    request: Request | BulkLoad;
    /**
     * Returns whether an attention acknowledgement was received.
     */
    attentionReceived: boolean;
    constructor(connection: Connection, request: Request | BulkLoad);
    onDone(token: DoneToken): void;
}
