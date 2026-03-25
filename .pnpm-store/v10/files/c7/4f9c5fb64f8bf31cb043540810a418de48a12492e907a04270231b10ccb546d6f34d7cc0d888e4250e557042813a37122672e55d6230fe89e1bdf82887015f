"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA = exports.SchemaTypes = void 0;
const connection_string_1 = __importDefault(require("./connection-string"));
var SchemaTypes;
(function (SchemaTypes) {
    SchemaTypes[SchemaTypes["BOOL"] = 0] = "BOOL";
    SchemaTypes[SchemaTypes["STRING"] = 1] = "STRING";
    SchemaTypes[SchemaTypes["NUMBER"] = 2] = "NUMBER";
})(SchemaTypes = exports.SchemaTypes || (exports.SchemaTypes = {}));
// schema for MSSQL connection strings (https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnection.connectionstring)
exports.SCHEMA = {
    'Application Name': {
        type: SchemaTypes.STRING,
        aliases: ['App'],
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
    'ApplicationIntent': {
        type: SchemaTypes.STRING,
        allowedValues: ['ReadOnly', 'ReadWrite'],
        default: 'ReadWrite',
    },
    'Asynchronous Processing': {
        type: SchemaTypes.BOOL,
        default: false,
        aliases: ['Async'],
    },
    'AttachDBFilename': {
        type: SchemaTypes.STRING,
        aliases: ['Extended Properties', 'Initial File Name'],
    },
    'Authentication': {
        type: SchemaTypes.STRING,
        allowedValues: ['Active Directory Integrated', 'Active Directory Password', 'Sql Password'],
    },
    'Column Encryption Setting': {
        type: SchemaTypes.STRING,
    },
    'Connection Timeout': {
        type: SchemaTypes.NUMBER,
        aliases: ['Connect Timeout', 'Timeout'],
        default: 15,
    },
    'Connection Lifetime': {
        type: SchemaTypes.NUMBER,
        aliases: ['Load Balance Timeout'],
        default: 0,
    },
    'ConnectRetryCount': {
        type: SchemaTypes.NUMBER,
        default: 1,
        validator(val) {
            return val > 0 && val <= 255;
        },
    },
    'ConnectRetryInterval': {
        type: SchemaTypes.NUMBER,
        default: 10,
    },
    'Context Connection': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Current Language': {
        aliases: ['Language'],
        type: SchemaTypes.STRING,
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
    'Data Source': {
        aliases: ['Addr', 'Address', 'Server', 'Network Address'],
        type: SchemaTypes.STRING,
    },
    'Encrypt': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Enlist': {
        type: SchemaTypes.BOOL,
        default: true,
    },
    'Failover Partner': {
        type: SchemaTypes.STRING,
    },
    'Initial Catalog': {
        type: SchemaTypes.STRING,
        aliases: ['Database'],
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
    'Integrated Security': {
        type: SchemaTypes.BOOL,
        aliases: ['Trusted_Connection'],
        coerce(val) {
            return val === 'sspi' || null;
        },
    },
    'Max Pool Size': {
        type: SchemaTypes.NUMBER,
        default: 100,
        validator(val) {
            return val >= 1;
        },
    },
    'Min Pool Size': {
        type: SchemaTypes.NUMBER,
        default: 0,
        validator(val) {
            return val >= 0;
        },
    },
    'MultipleActiveResultSets': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'MultiSubnetFailover': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Network Library': {
        type: SchemaTypes.STRING,
        aliases: ['Network', 'Net'],
        allowedValues: ['dbnmpntw', 'dbmsrpcn', 'dbmsadsn', 'dbmsgnet', 'dbmslpcn', 'dbmsspxn', 'dbmssocn', 'Dbmsvinn'],
    },
    'Packet Size': {
        type: SchemaTypes.NUMBER,
        default: 8000,
        validator(val) {
            return val >= 512 && val <= 32768;
        },
    },
    'Password': {
        type: SchemaTypes.STRING,
        aliases: ['PWD'],
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
    'Persist Security Info': {
        type: SchemaTypes.BOOL,
        aliases: ['PersistSecurityInfo'],
        default: false,
    },
    'PoolBlockingPeriod': {
        type: SchemaTypes.NUMBER,
        default: 0,
        coerce(val) {
            if (typeof val !== 'string') {
                return null;
            }
            switch (val.toLowerCase()) {
                case 'alwaysblock':
                    return 1;
                case 'auto':
                    return 0;
                case 'neverblock':
                    return 2;
            }
            return null;
        },
    },
    'Pooling': {
        type: SchemaTypes.BOOL,
        default: true,
    },
    'Replication': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Transaction Binding': {
        type: SchemaTypes.STRING,
        allowedValues: ['Implicit Unbind', 'Explicit Unbind'],
        default: 'Implicit Unbind',
    },
    'TransparentNetworkIPResolution': {
        type: SchemaTypes.BOOL,
        default: true,
    },
    'TrustServerCertificate': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Type System Version': {
        type: SchemaTypes.STRING,
        allowedValues: ['SQL Server 2012', 'SQL Server 2008', 'SQL Server 2005', 'Latest'],
    },
    'User ID': {
        type: SchemaTypes.STRING,
        aliases: ['UID'],
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
    'User Instance': {
        type: SchemaTypes.BOOL,
        default: false,
    },
    'Workstation ID': {
        type: SchemaTypes.STRING,
        aliases: ['WSID'],
        validator(val) {
            return typeof val === 'string' && val.length <= 128;
        },
    },
};
function guessType(value) {
    if (value.trim() === '') {
        return SchemaTypes.STRING;
    }
    const asNum = parseInt(value, 10);
    if (!Number.isNaN(asNum) && asNum.toString() === value) {
        return SchemaTypes.NUMBER;
    }
    if (['true', 'false', 'yes', 'no'].includes(value.toLowerCase())) {
        return SchemaTypes.BOOL;
    }
    return SchemaTypes.STRING;
}
function coerce(value, type, coercer) {
    if (coercer) {
        const coerced = coercer(value);
        if (coerced !== null) {
            return coerced;
        }
    }
    switch (type) {
        case SchemaTypes.BOOL:
            if (['true', 'yes', '1'].includes(value.toLowerCase())) {
                return true;
            }
            if (['false', 'no', '0'].includes(value.toLowerCase())) {
                return false;
            }
            return value;
        case SchemaTypes.NUMBER:
            return parseInt(value, 10);
    }
    return value;
}
function validate(value, allowedValues, validator) {
    let valid = true;
    if (validator) {
        valid = validator(value);
    }
    if (valid) {
        valid = (allowedValues === null || allowedValues === void 0 ? void 0 : allowedValues.includes(value)) || false;
    }
    return valid;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseSqlConnectionString(connectionString, canonicalProps = false, allowUnknown = false, strict = false, schema = exports.SCHEMA) {
    const flattenedSchema = Object.entries(schema).reduce((flattened, [key, item]) => {
        var _a;
        Object.assign(flattened, {
            [key.toLowerCase()]: item,
        });
        return ((_a = item.aliases) === null || _a === void 0 ? void 0 : _a.reduce((accum, alias) => {
            return Object.assign(accum, {
                [alias.toLowerCase()]: {
                    ...item,
                    canonical: key.toLowerCase(),
                },
            });
        }, flattened)) || flattened;
    }, {});
    return Object.entries((0, connection_string_1.default)(connectionString)).reduce((config, [prop, value]) => {
        if (!Object.prototype.hasOwnProperty.call(flattenedSchema, prop)) {
            return Object.assign(config, {
                [prop]: coerce(value, guessType(value)),
            });
        }
        let coercedValue = coerce(value, flattenedSchema[prop].type, flattenedSchema[prop].coerce);
        if (strict && !validate(coercedValue, flattenedSchema[prop].allowedValues, flattenedSchema[prop].validator)) {
            coercedValue = flattenedSchema[prop].default;
        }
        const propName = canonicalProps ? flattenedSchema[prop].canonical || prop : prop;
        return Object.assign(config, {
            [propName]: coercedValue,
        });
    }, {});
}
exports.default = parseSqlConnectionString;
//# sourceMappingURL=sql-connection-string.js.map