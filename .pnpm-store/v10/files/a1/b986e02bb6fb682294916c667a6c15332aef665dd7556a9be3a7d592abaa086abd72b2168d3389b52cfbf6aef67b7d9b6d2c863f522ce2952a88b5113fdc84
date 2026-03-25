// montage

/**
 * Montage images next to each other using the `montage` command in graphicsmagick.
 *
 * gm('/path/to/image.jpg')
 * .montage('/path/to/second_image.jpg')
 * .geometry('+100+150')
 * .write('/path/to/montage.png', function(err) {
 *   if(!err) console.log("Written montage image.");
 * });
 *
 * @param {String} other  Path to the image that contains the changes.
 */

module.exports = exports = function(proto) {
    proto.montage = function(other) {
        this.in(other);

        this.subCommand("montage");

        return this;
    }
}
