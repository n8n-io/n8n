let parser;
export function parseXML(xmlString) {
    if (!parser) {
        parser = new DOMParser();
    }
    const xmlDocument = parser.parseFromString(xmlString, "application/xml");
    if (xmlDocument.getElementsByTagName("parsererror").length > 0) {
        throw new Error("DOMParser XML parsing error.");
    }
    const xmlToObj = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent?.trim()) {
                return node.textContent;
            }
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.attributes.length === 0 && element.childNodes.length === 0) {
                return "";
            }
            const obj = {};
            const attributes = Array.from(element.attributes);
            for (const attr of attributes) {
                obj[`${attr.name}`] = attr.value;
            }
            const childNodes = Array.from(element.childNodes);
            for (const child of childNodes) {
                const childResult = xmlToObj(child);
                if (childResult != null) {
                    const childName = child.nodeName;
                    if (childNodes.length === 1 && attributes.length === 0 && childName === "#text") {
                        return childResult;
                    }
                    if (obj[childName]) {
                        if (Array.isArray(obj[childName])) {
                            obj[childName].push(childResult);
                        }
                        else {
                            obj[childName] = [obj[childName], childResult];
                        }
                    }
                    else {
                        obj[childName] = childResult;
                    }
                }
                else if (childNodes.length === 1 && attributes.length === 0) {
                    return element.textContent;
                }
            }
            return obj;
        }
        return null;
    };
    return {
        [xmlDocument.documentElement.nodeName]: xmlToObj(xmlDocument.documentElement),
    };
}
