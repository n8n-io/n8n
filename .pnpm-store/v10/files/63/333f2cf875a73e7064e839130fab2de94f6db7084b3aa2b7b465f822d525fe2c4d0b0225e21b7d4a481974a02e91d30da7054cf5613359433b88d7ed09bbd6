exports.readContentTypesFromXml = readContentTypesFromXml;

var fallbackContentTypes = {
    "png": "png",
    "gif": "gif",
    "jpeg": "jpeg",
    "jpg": "jpeg",
    "tif": "tiff",
    "tiff": "tiff",
    "bmp": "bmp"
};

exports.defaultContentTypes = contentTypes({}, {});


function readContentTypesFromXml(element) {
    var extensionDefaults = {};
    var overrides = {};
    
    element.children.forEach(function(child) {
        if (child.name === "content-types:Default") {
            extensionDefaults[child.attributes.Extension] = child.attributes.ContentType;
        }
        if (child.name === "content-types:Override") {
            var name = child.attributes.PartName;
            if (name.charAt(0) === "/") {
                name = name.substring(1);
            }
            overrides[name] = child.attributes.ContentType;
        }
    });
    return contentTypes(overrides, extensionDefaults);
}

function contentTypes(overrides, extensionDefaults) {
    return {
        findContentType: function(path) {
            var overrideContentType = overrides[path];
            if (overrideContentType) {
                return overrideContentType;
            } else {
                var pathParts = path.split(".");
                var extension = pathParts[pathParts.length - 1];
                if (extensionDefaults.hasOwnProperty(extension)) {
                    return extensionDefaults[extension];
                } else {
                    var fallback = fallbackContentTypes[extension.toLowerCase()];
                    if (fallback) {
                        return "image/" + fallback;
                    } else {
                        return null;
                    }
                }
            }
        }
    };
    
}
