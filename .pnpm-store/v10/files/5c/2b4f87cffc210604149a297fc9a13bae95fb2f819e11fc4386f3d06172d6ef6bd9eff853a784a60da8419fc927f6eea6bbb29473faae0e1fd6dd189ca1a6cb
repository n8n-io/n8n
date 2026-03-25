"use strict";
var protobuf = module.exports = require("./index-light");

protobuf.build = "full";

// Parser
protobuf.tokenize         = require("./tokenize");
protobuf.parse            = require("./parse");
protobuf.common           = require("./common");

// Configure parser
protobuf.Root._configure(protobuf.Type, protobuf.parse, protobuf.common);
