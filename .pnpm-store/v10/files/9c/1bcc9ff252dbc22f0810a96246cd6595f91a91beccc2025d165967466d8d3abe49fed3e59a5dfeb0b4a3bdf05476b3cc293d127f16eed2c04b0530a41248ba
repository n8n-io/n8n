"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSshConnection = void 0;
const ssh2_1 = require("ssh2");
const net_1 = __importDefault(require("net"));
const SshConnection_1 = require("./SshConnection");
const createSshConnection = (connectConfig) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield new Promise((resolve) => {
        const connection = new ssh2_1.Client();
        connection
            .on("ready", () => resolve(connection))
            .on("tcp connection", (info, accept) => {
            const stream = accept();
            stream.pause();
            const socket = net_1.default.connect(info.destPort, info.destIP, () => {
                stream.pipe(socket);
                socket.pipe(stream);
                stream.resume();
            });
        })
            .connect(connectConfig);
    });
    return new SshConnection_1.SshConnection(client);
});
exports.createSshConnection = createSshConnection;
