var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ClassDeleter from './classDeleter.js';
import SchemaGetter from './getter.js';
export default (client) => __awaiter(void 0, void 0, void 0, function* () {
    const getter = new SchemaGetter(client);
    const schema = yield getter.do();
    yield Promise.all(schema.classes
        ? schema.classes.map((c) => {
            const deleter = new ClassDeleter(client);
            return deleter.withClassName(c.class).do();
        })
        : []);
});
