import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { JsonShapeDeserializer } from "./JsonShapeDeserializer";
import { JsonShapeSerializer } from "./JsonShapeSerializer";
export class JsonCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new JsonShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new JsonShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}
