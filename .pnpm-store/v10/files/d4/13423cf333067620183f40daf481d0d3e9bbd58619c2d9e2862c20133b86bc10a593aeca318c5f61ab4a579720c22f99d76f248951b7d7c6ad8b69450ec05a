import { Collation } from '../collation';
import { type Metadata } from '../metadata-parser';
import { type ColumnMetadata } from './colmetadata-token-parser';
import { TokenHandler } from './handler';
export declare const TYPE: {
    ALTMETADATA: number;
    ALTROW: number;
    COLMETADATA: number;
    COLINFO: number;
    DONE: number;
    DONEPROC: number;
    DONEINPROC: number;
    ENVCHANGE: number;
    ERROR: number;
    FEATUREEXTACK: number;
    FEDAUTHINFO: number;
    INFO: number;
    LOGINACK: number;
    NBCROW: number;
    OFFSET: number;
    ORDER: number;
    RETURNSTATUS: number;
    RETURNVALUE: number;
    ROW: number;
    SSPI: number;
    TABNAME: number;
};
type HandlerName = keyof TokenHandler;
export declare abstract class Token {
    name: string;
    handlerName: keyof TokenHandler;
    constructor(name: string, handlerName: HandlerName);
}
export declare class ColMetadataToken extends Token {
    name: 'COLMETADATA';
    handlerName: 'onColMetadata';
    columns: ColumnMetadata[];
    constructor(columns: ColumnMetadata[]);
}
export declare class DoneToken extends Token {
    name: 'DONE';
    handlerName: 'onDone';
    more: boolean;
    sqlError: boolean;
    attention: boolean;
    serverError: boolean;
    rowCount: number | undefined;
    curCmd: number;
    constructor({ more, sqlError, attention, serverError, rowCount, curCmd }: {
        more: boolean;
        sqlError: boolean;
        attention: boolean;
        serverError: boolean;
        rowCount: number | undefined;
        curCmd: number;
    });
}
export declare class DoneInProcToken extends Token {
    name: 'DONEINPROC';
    handlerName: 'onDoneInProc';
    more: boolean;
    sqlError: boolean;
    attention: boolean;
    serverError: boolean;
    rowCount: number | undefined;
    curCmd: number;
    constructor({ more, sqlError, attention, serverError, rowCount, curCmd }: {
        more: boolean;
        sqlError: boolean;
        attention: boolean;
        serverError: boolean;
        rowCount: number | undefined;
        curCmd: number;
    });
}
export declare class DoneProcToken extends Token {
    name: 'DONEPROC';
    handlerName: 'onDoneProc';
    more: boolean;
    sqlError: boolean;
    attention: boolean;
    serverError: boolean;
    rowCount: number | undefined;
    curCmd: number;
    constructor({ more, sqlError, attention, serverError, rowCount, curCmd }: {
        more: boolean;
        sqlError: boolean;
        attention: boolean;
        serverError: boolean;
        rowCount: number | undefined;
        curCmd: number;
    });
}
export declare class DatabaseEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onDatabaseChange';
    type: 'DATABASE';
    newValue: string;
    oldValue: string;
    constructor(newValue: string, oldValue: string);
}
export declare class LanguageEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onLanguageChange';
    type: 'LANGUAGE';
    newValue: string;
    oldValue: string;
    constructor(newValue: string, oldValue: string);
}
export declare class CharsetEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onCharsetChange';
    type: 'CHARSET';
    newValue: string;
    oldValue: string;
    constructor(newValue: string, oldValue: string);
}
export declare class PacketSizeEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onPacketSizeChange';
    type: 'PACKET_SIZE';
    newValue: number;
    oldValue: number;
    constructor(newValue: number, oldValue: number);
}
export declare class BeginTransactionEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onBeginTransaction';
    type: 'BEGIN_TXN';
    newValue: Buffer;
    oldValue: Buffer;
    constructor(newValue: Buffer, oldValue: Buffer);
}
export declare class CommitTransactionEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onCommitTransaction';
    type: 'COMMIT_TXN';
    newValue: Buffer;
    oldValue: Buffer;
    constructor(newValue: Buffer, oldValue: Buffer);
}
export declare class RollbackTransactionEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onRollbackTransaction';
    type: 'ROLLBACK_TXN';
    oldValue: Buffer;
    newValue: Buffer;
    constructor(newValue: Buffer, oldValue: Buffer);
}
export declare class DatabaseMirroringPartnerEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onDatabaseMirroringPartner';
    type: 'DATABASE_MIRRORING_PARTNER';
    oldValue: string;
    newValue: string;
    constructor(newValue: string, oldValue: string);
}
export declare class ResetConnectionEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onResetConnection';
    type: 'RESET_CONNECTION';
    oldValue: Buffer;
    newValue: Buffer;
    constructor(newValue: Buffer, oldValue: Buffer);
}
export type EnvChangeToken = DatabaseEnvChangeToken | LanguageEnvChangeToken | CharsetEnvChangeToken | PacketSizeEnvChangeToken | BeginTransactionEnvChangeToken | CommitTransactionEnvChangeToken | RollbackTransactionEnvChangeToken | DatabaseMirroringPartnerEnvChangeToken | ResetConnectionEnvChangeToken | RoutingEnvChangeToken | CollationChangeToken;
export declare class CollationChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onSqlCollationChange';
    type: 'SQL_COLLATION';
    oldValue: Collation | undefined;
    newValue: Collation | undefined;
    constructor(newValue: Collation | undefined, oldValue: Collation | undefined);
}
export declare class RoutingEnvChangeToken extends Token {
    name: 'ENVCHANGE';
    handlerName: 'onRoutingChange';
    type: 'ROUTING_CHANGE';
    newValue: {
        protocol: number;
        port: number;
        server: string;
    };
    oldValue: Buffer;
    constructor(newValue: {
        protocol: number;
        port: number;
        server: string;
    }, oldValue: Buffer);
}
export declare class FeatureExtAckToken extends Token {
    name: 'FEATUREEXTACK';
    handlerName: 'onFeatureExtAck';
    fedAuth: Buffer | undefined;
    /** Value of UTF8_SUPPORT acknowledgement.
     *
     * undefined when UTF8_SUPPORT not included in token. */
    utf8Support: boolean | undefined;
    constructor(fedAuth: Buffer | undefined, utf8Support: boolean | undefined);
}
export declare class FedAuthInfoToken extends Token {
    name: 'FEDAUTHINFO';
    handlerName: 'onFedAuthInfo';
    spn: string | undefined;
    stsurl: string | undefined;
    constructor(spn: string | undefined, stsurl: string | undefined);
}
export declare class InfoMessageToken extends Token {
    name: 'INFO';
    handlerName: 'onInfoMessage';
    number: number;
    state: number;
    class: number;
    message: string;
    serverName: string;
    procName: string;
    lineNumber: number;
    constructor({ number, state, class: clazz, message, serverName, procName, lineNumber }: {
        number: number;
        state: number;
        class: number;
        message: string;
        serverName: string;
        procName: string;
        lineNumber: number;
    });
}
export declare class ErrorMessageToken extends Token {
    name: 'ERROR';
    handlerName: 'onErrorMessage';
    number: number;
    state: number;
    class: number;
    message: string;
    serverName: string;
    procName: string;
    lineNumber: number;
    constructor({ number, state, class: clazz, message, serverName, procName, lineNumber }: {
        number: number;
        state: number;
        class: number;
        message: string;
        serverName: string;
        procName: string;
        lineNumber: number;
    });
}
export declare class LoginAckToken extends Token {
    name: 'LOGINACK';
    handlerName: 'onLoginAck';
    interface: string;
    tdsVersion: string;
    progName: string;
    progVersion: {
        major: number;
        minor: number;
        buildNumHi: number;
        buildNumLow: number;
    };
    constructor({ interface: interfaze, tdsVersion, progName, progVersion }: {
        interface: LoginAckToken['interface'];
        tdsVersion: LoginAckToken['tdsVersion'];
        progName: LoginAckToken['progName'];
        progVersion: LoginAckToken['progVersion'];
    });
}
export declare class NBCRowToken extends Token {
    name: 'NBCROW';
    handlerName: 'onRow';
    columns: any;
    constructor(columns: any);
}
export declare class OrderToken extends Token {
    name: 'ORDER';
    handlerName: 'onOrder';
    orderColumns: number[];
    constructor(orderColumns: number[]);
}
export declare class ReturnStatusToken extends Token {
    name: 'RETURNSTATUS';
    handlerName: 'onReturnStatus';
    value: number;
    constructor(value: number);
}
export declare class ReturnValueToken extends Token {
    name: 'RETURNVALUE';
    handlerName: 'onReturnValue';
    paramOrdinal: number;
    paramName: string;
    metadata: Metadata;
    value: unknown;
    constructor({ paramOrdinal, paramName, metadata, value }: {
        paramOrdinal: number;
        paramName: string;
        metadata: Metadata;
        value: unknown;
    });
}
export declare class RowToken extends Token {
    name: 'ROW';
    handlerName: 'onRow';
    columns: any;
    constructor(columns: any);
}
export declare class SSPIToken extends Token {
    name: 'SSPICHALLENGE';
    handlerName: 'onSSPI';
    ntlmpacket: any;
    ntlmpacketBuffer: Buffer;
    constructor(ntlmpacket: any, ntlmpacketBuffer: Buffer);
}
export {};
