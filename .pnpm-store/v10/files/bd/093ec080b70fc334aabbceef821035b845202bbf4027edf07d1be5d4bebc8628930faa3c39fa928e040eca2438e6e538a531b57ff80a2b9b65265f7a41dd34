/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Node18FormData, WebFormData } from "../../../src/core/form-data-utils/FormDataWrapper";

describe("CrossPlatformFormData", () => {
    describe("Node18FormData", () => {
        let formData: any;

        beforeEach(async () => {
            formData = new Node18FormData();
            await formData.setup();
        });

        it("should append a Readable stream with a specified filename", async () => {
            const value = (await import("readable-stream")).Readable.from(["file content"]);
            const filename = "testfile.txt";

            await formData.appendFile("file", value, filename);

            const request = await formData.getRequest();
            const decoder = new TextDecoder("utf-8");
            let data = "";
            for await (const chunk of request.body) {
                data += decoder.decode(chunk);
            }
            expect(data).toContain(filename);
        });

        it("should append a Blob with a specified filename", async () => {
            const value = new Blob(["file content"], { type: "text/plain" });
            const filename = "testfile.txt";

            await formData.appendFile("file", value, filename);

            const request = await formData.getRequest();
            const decoder = new TextDecoder("utf-8");
            let data = "";
            for await (const chunk of request.body) {
                data += decoder.decode(chunk);
            }
            expect(data).toContain(filename);
        });

        it("should append a File with a specified filename", async () => {
            const filename = "testfile.txt";
            // @ts-expect-error
            const value = new (await import("buffer")).File(["file content"], filename);

            await formData.appendFile("file", value);

            const request = await formData.getRequest();
            const decoder = new TextDecoder("utf-8");
            let data = "";
            for await (const chunk of request.body) {
                data += decoder.decode(chunk);
            }
            expect(data).toContain("testfile.txt");
        });

        it("should append a File with an explicit filename", async () => {
            const filename = "testfile.txt";
            // @ts-expect-error
            const value = new (await import("buffer")).File(["file content"], filename);

            await formData.appendFile("file", value, "test.txt");

            const request = await formData.getRequest();
            const decoder = new TextDecoder("utf-8");
            let data = "";
            for await (const chunk of request.body) {
                data += decoder.decode(chunk);
            }
            expect(data).toContain("test.txt");
        });
    });

    describe("WebFormData", () => {
        let formData: any;

        beforeEach(async () => {
            formData = new WebFormData();
            await formData.setup();
        });

        it("should append a Readable stream with a specified filename", async () => {
            const value = (await import("stream")).Readable.from(["file content"]);
            const filename = "testfile.txt";

            await formData.appendFile("file", value, filename);

            const request = formData.getRequest();
            expect(request.body.get("file").name).toBe(filename);
        });

        it("should append a Blob with a specified filename", async () => {
            const value = new Blob(["file content"], { type: "text/plain" });
            const filename = "testfile.txt";

            await formData.appendFile("file", value, filename);

            const request = formData.getRequest();

            expect(request.body.get("file").name).toBe(filename);
        });

        it("should append a File with a specified filename", async () => {
            const filename = "testfile.txt";
            // @ts-expect-error
            const value = new (await import("buffer")).File(["file content"], filename);

            await formData.appendFile("file", value);

            const request = formData.getRequest();
            expect(request.body.get("file").name).toBe(filename);
        });

        it("should append a File with an explicit filename", async () => {
            const filename = "testfile.txt";
            // @ts-expect-error
            const value = new (await import("buffer")).File(["file content"], filename);

            await formData.appendFile("file", value, "test.txt");

            const request = formData.getRequest();
            expect(request.body.get("file").name).toBe("test.txt");
        });
    });
});
