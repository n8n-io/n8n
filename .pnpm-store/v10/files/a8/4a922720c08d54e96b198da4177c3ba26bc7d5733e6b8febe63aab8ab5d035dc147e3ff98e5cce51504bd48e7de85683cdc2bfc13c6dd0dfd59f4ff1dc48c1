/// <reference types="node"/>

import stream = require("stream");

declare function m(stream: NodeJS.ReadableStream | Buffer | string, image?: string): m.State;
declare function m(width: number, height: number, color?: string): m.State;

declare namespace m {
    interface ClassOptions {
        appPath?: string | undefined;
        imageMagick?: string | boolean | undefined;
        nativeAutoOrient?: boolean | undefined;
        timeout?: string | number;
    }

    interface ChannelInfo<T> {
        Red: T;
        Green: T;
        Blue: T;
    }

    interface CompareOptions {
        file?: string | undefined;
        highlightColor?: string | undefined;
        highlightStyle?: HighlightStyle | undefined;
        tolerance?: number | undefined;
    }

    interface ColorStatistics {
        Minimum: string;
        Maximum: string;
        Mean: string;
        "Standard Deviation": string;
    }

    interface Dimensions {
        width: number;
        height: number;
    }

    interface GetterOptions {
        bufferStream?: boolean | undefined;
    }

    interface ImageInfo {
        "Background Color": string;
        "Border Color": string;
        "Channel Depths": ChannelInfo<string>;
        "Channel Statistics": ChannelInfo<ColorStatistics>;
        Class: string;
        color: number;
        Compose: string;
        Compression: string;
        depth: number;
        Depth: string;
        Dispose: string;
        Filesize: string;
        format: string;
        Format: string;
        Geometry: string;
        Interlace: string;
        Iterations: string;
        "JPEG-Quality"?: string | undefined;
        "JPEG-Colorspace"?: string | undefined;
        "JPEG-Colorspace-Name"?: string | undefined;
        "JPEG-Sampling-factors"?: string | undefined;
        "Matte Color": string;
        Orientation: string;
        "Page geometry": string;
        path: string;

        "Profile-color"?: string | undefined;
        "Profile-iptc"?: {
            [key: string]: string;
        } | undefined;
        "Profile-EXIF"?: {
            [key: string]: string;
        } | undefined;
        "Profile-XMP"?: string | undefined;
        Resolution?: string | undefined;
        size: Dimensions;
        Signature: string;
        Software: string;
        Tainted: string;
        Type: string;
    }

    interface State {
        // Image Operations
        adjoin(): State;
        affine(matrix: string): State;
        antialias(enable: boolean): State;
        append(ltr?: boolean): State;
        append(image: string | string[], ltr?: boolean): State;
        authenticate(password: string): State;
        autoOrient(): State;
        average(): State;
        backdrop(): State;
        background(color: string): State;
        bitdepth(bits: number): State;
        blackThreshold(intensity: number): State;
        blackThreshold(red: number, green: number, blue: number, opacity?: number): State;
        bluePrimary(x: number, y: number): State;
        blur(radius: number, sigma?: number): State;
        border(width: number, height: number): State;
        borderColor(color: string): State;
        box(color: string): State;
        channel(type: NamedColor | string): State;
        charcoal(factor: number): State;
        chop(width: number, height: number, x?: number, y?: number): State;
        clip(): State;
        coalesce(): State;
        colorize(red: number, green: number, blue: number): State;
        colorMap(type: "shared" | "private" | string): State;
        colors(colors: number): State;
        colorspace(space: ColorSpace | string): State;
        command(customCommand: string): State;
        compose(operator: ComposeOperator | string): State;
        composite(changeImagePath: string, maskImagePath?: string): State;
        compress(type: CompressionType | string): State;
        contrast(multiplier: number): State;
        convolve(kernel: string): State;
        createDirectories(): State;
        crop(width: number, height: number, x?: number, y?: number, percent?: boolean): State;
        cycle(amount: number): State;
        deconstruct(): State;
        define(value: string): State;
        delay(centiseconds: number): State;
        density(width: number, height: number): State;
        despeckle(): State;
        displace(horizontal: number, vertical: number): State;
        display(xServer: string): State;
        dispose(method: DisposeMethod | string): State;
        dissolve(percent: number): State;
        dither(enable?: boolean): State;
        edge(radius?: number): State;
        emboss(radius?: number): State;
        encoding(encoding: Encoding | string): State;
        endian(type: EndianType | string): State;
        enhance(): State;
        equalize(): State;
        extent(width: number, height: number, options?: string): State;
        file(filename: string): State;
        filter(type: FilterType | string): State;
        flatten(): State;
        flip(): State;
        flop(): State;
        foreground(color: string): State;
        frame(width: number, height: number, outerBevelWidth: number, outBevelHeight: number): State;
        fuzz(distance: number, percent?: boolean): State;
        gamma(r: number, g: number, b: number): State;
        gaussian(radius: number, sigma?: number): State;
        geometry(width: number, height?: number, option?: ResizeOption): State;
        geometry(geometry: string): State;
        greenPrimary(x: number, y: number): State;
        gravity(direction: GravityDirection | string): State;
        highlightColor(color: string): State;
        highlightStyle(style: HighlightStyle | string): State;
        iconGeometry(geometry: string): State;
        implode(factor?: number): State;
        in(...customArguments: string[]): State;
        intent(type: IntentType | string): State;
        interlace(type: InterlaceType | string): State;
        label(name: string): State;
        lat(width: number, height: number, offset: number, percent?: boolean): State;
        level(blackPoint: number, gamma: number, whitePoint: number, percent?: boolean): State;
        limit(type: LimitType | string, val: string): State;
        list(type: ListType | string): State;
        log(format: string): State;
        loop(iterations: number): State;
        lower(width: number, height: number): State;
        magnify(factor: number): State;
        map(filename: string): State;
        mask(filename: string): State;
        matte(): State;
        matteColor(color: string): State;
        maximumError(limit: number): State;
        median(radius?: number): State;
        minify(factor: number): State;
        mode(mode: OperationMode | string): State;
        modulate(b: number, s?: number, h?: number): State;
        monitor(): State;
        monochrome(): State;
        montage(otherImg: string): State;
        morph(otherImg: string | string[], outName: string, callback?: WriteCallback): State;
        mosaic(): State;
        motionBlur(radius: number, sigma?: number, angle?: number): State;
        name(): State;
        negative(): State;
        noise(type: NoiseType | string | number): State;
        noop(): State;
        normalize(): State;
        opaque(color: string): State;
        operator(channel: string, operator: ChannelOperator | string, rvalue: number, percent?: boolean): State;
        orderedDither(channelType: ChannelType | string, NxN: string): State;
        out(...customArguments: string[]): State;
        outputDirectory(directory: string): State;
        page(width: number, height: number, arg?: "%" | "!" | "<" | ">" | string): State;
        pause(seconds: number): State;
        pen(color: string): State;
        ping(): State;
        pointSize(size: number): State;
        noProfile(): State;
        preview(type: PreviewType | string): State;
        paint(radius: number): State;
        process(command: string): State;
        profile(filename: string): State;
        progress(): State;
        randomThreshold(channelType: ChannelType, LOWxHIGH: string): State;
        quality(level: number): State;
        raise(width: number, height: number): State;
        recolor(matrix: string): State;
        redPrimary(x: number, y: number): State;
        region(width: number, height: number, x?: number, y?: number): State;
        remote(): State;
        render(): State;
        repage(reset: "+" | string): State;
        repage(width: number, height: number, xoff: number, yoff: number, arg?: string): State;
        sample(geometry: string): State;
        samplingFactor(horizontalFactor: number, verticalFactor: number): State;
        rawSize(width: number, height: number, offset?: number): State;
        resample(horizontal: number, vertical: number): State;
        resize(width: number, height: number, option: ResizeOption): State;
        resize(width: number, height?: number, option?: ResizeOption): State;
        roll(horizontal: number, vertical: number): State;
        rotate(backgroundColor: string, degrees: number): State;
        scene(index: number): State;
        scenes(start: number, end: number): State;
        scale(width: number, height: number): State;
        screen(): State;
        segment(clustherThreshold: number, smoothingThreshold: number): State;
        /** change the specified frame. */
        selectFrame(frame: number): State;
        sepia(): State;
        set(attribute: string, value: string): State;
        setFormat(format: string): State;
        shade(azimuth: number, elevation: number): State;
        shadow(radius: number, sigma?: number): State;
        sharedMemory(): State;
        shave(width: number, height: number, percent?: boolean): State;
        sharpen(radius: number, sigma?: number): State;
        shear(xDegrees: number, yDegress: number): State;
        silent(): State;
        snaps(count: number): State;
        solarize(threshold: number): State;
        spread(amount: number): State;
        stegano(offset: number): State;
        stereo(): State;
        strip(): State;
        swirl(degrees: number): State;
        textFont(font: string): State;
        texture(filename: string): State;
        threshold(value: number, percent?: boolean): State;
        thumb(width: number, height: number, outName: string, callback: WriteCallback): State;
        thumb(width: number, height: number, outName: string, quality: number, callback: WriteCallback): State;
        thumb(
            width: number,
            height: number,
            outName: string,
            quality: number,
            align: "topleft" | "center" | string,
            callback: WriteCallback,
        ): State;
        thumbnail(width: number, height: number, options?: ResizeOption): State;
        tile(filename: string): State;
        title(title: string): State;
        transform(color: string): State;
        transparent(color: string): State;
        treeDepth(depth: number): State;
        trim(): State;
        type(type: ImageType | string): State;
        update(seconds: number): State;
        units(type: UnitType | string): State;
        unsharp(radius: number, sigma?: number, amount?: number, threshold?: number): State;
        usePixmap(): State;
        view(): State;
        virtualPixel(method: VirtualPixelMethod | string): State;
        visual(type: VisualType | string): State;
        watermark(brightness: number, saturation: number): State;
        wave(amplitude: number, wavelength: number): State;
        whitePoint(x: number, y: number): State;
        whiteThreshold(intensity: number): State;
        whiteThreshold(red: number, green: number, blue: number, opacity?: number): State;
        window(id: string): State;
        windowGroup(): State;

        // Getters
        color(callback: GetterCallback<number>): State;
        color(opts: GetterOptions, callback: GetterCallback<number>): State;
        depth(callback: GetterCallback<number>): State;
        depth(opts: GetterOptions, callback: GetterCallback<number>): State;
        filesize(callback: GetterCallback<string>): State;
        filesize(opts: GetterOptions, callback: GetterCallback<string>): State;
        format(callback: GetterCallback<string>): State;
        format(opts: GetterOptions, callback: GetterCallback<string>): State;
        identify(callback: GetterCallback<ImageInfo>): State;
        identify(format: string, callback: GetterCallback<string>): State;
        identify(opts: GetterOptions, callback: GetterCallback<ImageInfo>): State;
        res(callback: GetterCallback<string>): State;
        res(opts: GetterOptions, callback: GetterCallback<string>): State;
        size(callback: GetterCallback<Dimensions>): State;
        size(opts: GetterOptions, callback: GetterCallback<Dimensions>): State;
        orientation(callback: GetterCallback<string>): State;
        orientation(opts: GetterOptions, callback: GetterCallback<string>): State;

        // Drawing Operations
        draw(args: string): State;
        drawArc(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number): State;
        drawBezier(coord0: [number, number], coord1: [number, number], ...coords: Array<[number, number]>): State;
        drawCircle(x0: number, y0: number, x1: number, y1: number): State;
        drawEllipse(x0: number, y0: number, rx: number, ry: number, a0: number, a1: number): State;
        drawLine(x0: number, y0: number, x1: number, y1: number): State;
        drawPoint(x: number, y: number): State;
        drawPolygon(
            coord0: [number, number],
            coord1: [number, number],
            coord2: [number, number],
            ...coords: Array<[number, number]>
        ): State;
        drawPolyline(
            coord0: [number, number],
            coord1: [number, number],
            coord2: [number, number],
            ...coords: Array<[number, number]>
        ): State;
        drawRectangle(x0: number, y0: number, x1: number, y1: number, wc?: number, hc?: number): State;
        drawText(x: number, y: number, text: string, gravity?: GravityDirection | string): State;
        fill(color: string): State;
        font(name: string, size?: number): State;
        fontSize(size: number): State;
        stroke(color: string, width?: number): State;
        strokeWidth(width: number): State;
        setDraw(property: SetDrawProperty | string, x: number, y: number, method: SetDrawMethod | string): State;

        // Commands
        stream(callback?: WriteCallback): stream.PassThrough;
        stream(format: string, callback?: WriteCallback): stream.PassThrough;
        toBuffer(callback: (err: Error | null, buffer: Buffer) => any): stream.PassThrough;
        toBuffer(format: string, callback: (err: Error | null, buffer: Buffer) => any): stream.PassThrough;
        write(filename: string, callback: WriteCallback): void;
    }

    interface SubClass {
        (image: string): State;
        (stream: NodeJS.ReadableStream | Buffer, image?: string): State;
        (width: number, height: number, color?: string): State;
    }

    function compare(filename1: string, filename2: string, callback: CompareCallback): void;
    function compare(
        filename1: string,
        filename2: string,
        options: CompareOptions | number,
        callback: CompareCallback,
    ): void;

    function subClass(options: ClassOptions): SubClass;

    type ChannelOperator =
        | "Add"
        | "And"
        | "Assign"
        | "Depth"
        | "Divide"
        | "Gamma"
        | "Negate"
        | "LShift"
        | "Log"
        | "Max"
        | "Min"
        | "Multiply"
        | "Or"
        | "Pow"
        | "RShift"
        | "Subtract"
        | "Threshold"
        | "Threshold-White"
        | "Threshold-White-Negate"
        | "Threshold-Black"
        | "Threshold-Black-Negate"
        | "Xor"
        | "Noise-Gaussian"
        | "Noise-Impulse"
        | "Noise-Laplacian"
        | "Noise-Multiplicative"
        | "Noise-Poisson"
        | "Noise-Random"
        | "Noise-Uniform";

    type ChannelType =
        | "All"
        | "Intensity"
        | "Red"
        | "Green"
        | "Blue"
        | "Cyan"
        | "Magenta"
        | "Yellow"
        | "Black"
        | "Opacity";

    type ColorSpace =
        | "CineonLog"
        | "CMYK"
        | "GRAY"
        | "HSL"
        | "HSB"
        | "OHTA"
        | "RGB"
        | "Rec601Luma"
        | "Rec709Luma"
        | "Rec601YCbCr"
        | "Rec709YCbCr"
        | "Transparent"
        | "XYZ"
        | "YCbCr"
        | "YIQ"
        | "YPbPr"
        | "YUV";

    type CompareCallback = (err: Error | null, isEqual: boolean, equality: number, raw: number) => any;

    type ComposeOperator =
        | "Over"
        | "In"
        | "Out"
        | "Atop"
        | "Xor"
        | "Plus"
        | "Minus"
        | "Add"
        | "Subtract"
        | "Difference"
        | "Divide"
        | "Multiply"
        | "Bumpmap"
        | "Copy"
        | "CopyRed"
        | "CopyGreen"
        | "CopyBlue"
        | "CopyOpacity"
        | "CopyCyan"
        | "CopyMagenta"
        | "CopyYellow"
        | "CopyBlack";

    type CompressionType =
        | "None"
        | "BZip"
        | "Fax"
        | "Group4"
        | "JPEG"
        | "Lossless"
        | "LZW"
        | "RLE"
        | "Zip"
        | "LZMA";

    type DisposeMethod =
        | "Undefined"
        | "None"
        | "Background"
        | "Previous";

    type Encoding =
        | "AdobeCustom"
        | "AdobeExpert"
        | "AdobeStandard"
        | "AppleRoman"
        | "BIG5"
        | "GB2312"
        | "Latin 2"
        | "None"
        | "SJIScode"
        | "Symbol"
        | "Unicode"
        | "Wansung";

    type EndianType =
        | "MSB"
        | "LSB"
        | "Native";

    type FilterType =
        | "Point"
        | "Box"
        | "Triangle"
        | "Hermite"
        | "Hanning"
        | "Hamming"
        | "Blackman"
        | "Gaussian"
        | "Quadratic"
        | "Cubic"
        | "Catrom"
        | "Mitchell"
        | "Lanczos"
        | "Bessel"
        | "Sinc";

    type GetterCallback<T> = (err: Error | null, value: T) => any;

    type GravityDirection =
        | "NorthWest"
        | "North"
        | "NorthEast"
        | "West"
        | "Center"
        | "East"
        | "SouthWest"
        | "South"
        | "SouthEast";

    type HighlightStyle =
        | "Assign"
        | "Threshold"
        | "Tint"
        | "XOR";

    type ImageType =
        | "Bilevel"
        | "Grayscale"
        | "Palette"
        | "PaletteMatte"
        | "TrueColor"
        | "TrueColorMatte"
        | "ColorSeparation"
        | "ColorSeparationMatte"
        | "Optimize";

    type IntentType =
        | "Absolute"
        | "Perceptual"
        | "Relative"
        | "Saturation";

    type InterlaceType =
        | "None"
        | "Line"
        | "Plane"
        | "Partition";

    type LimitType =
        | "disk"
        | "file"
        | "map"
        | "memory"
        | "pixels"
        | "threads";

    type ListType =
        | "Color"
        | "Delegate"
        | "Format"
        | "Magic"
        | "Module"
        | "Resource"
        | "Type";

    type NamedColor =
        | "Red"
        | "Green"
        | "Blue"
        | "Opacity"
        | "Matte"
        | "Cyan"
        | "Magenta"
        | "Yellow"
        | "Black"
        | "Gray";

    type NoiseType =
        | "uniform"
        | "gaussian"
        | "multiplicative"
        | "impulse"
        | "laplacian"
        | "poisson";

    type OperationMode =
        | "frame"
        | "unframe"
        | "concatenate";

    type PreviewType =
        | "Rotate"
        | "Shear"
        | "Roll"
        | "Hue"
        | "Saturation"
        | "Brightness"
        | "Gamma"
        | "Spiff"
        | "Dull"
        | "Grayscale"
        | "Quantize"
        | "Despeckle"
        | "ReduceNoise"
        | "AddNoise"
        | "Sharpen"
        | "Blur"
        | "Threshold"
        | "EdgeDetect"
        | "Spread"
        | "Shade"
        | "Raise"
        | "Segment"
        | "Solarize"
        | "Swirl"
        | "Implode"
        | "Wave"
        | "OilPaint"
        | "CharcoalDrawing"
        | "JPEG";

    type ResizeOption =
        | "%" /** Width and height are specified in percents */
        | "@" /** Specify maximum area in pixels */
        | "!" /** Ignore aspect ratio */
        | "^" /** Width and height are minimum values */
        | "<" /** Change dimensions only if image is smaller than width or height */
        | ">"; /** Change dimensions only if image is larger than width or height */

    type SetDrawMethod =
        | "point"
        | "replace"
        | "floodfill"
        | "filltoborder"
        | "reset";

    type SetDrawProperty = "color" | "matte";

    type UnitType =
        | "Undefined"
        | "PixelsPerInch"
        | "PixelsPerCentimeter";

    type VirtualPixelMethod =
        | "Constant"
        | "Edge"
        | "Mirror"
        | "Tile";

    type VisualType =
        | "StaticGray"
        | "GrayScale"
        | "StaticColor"
        | "PseudoColor"
        | "TrueColor"
        | "DirectColor"
        | "default";

    type WriteCallback = (err: Error | null, stdout: stream.Readable, stderr: stream.Readable, cmd: string) => any;
}

export = m;
