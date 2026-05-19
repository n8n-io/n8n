# Supported platforms

-   [NodeJS](#nodejs)
-   [Browser](#browser)
-   [Cordova / PhoneGap / Ionic apps](#cordova--phonegap--ionic-apps)
-   [React Native](#react-native)
-   [Expo](#expo)
-   [NativeScript](#nativescript)

## NodeJS

TypeORM was tested on Node.js version 14 and above.

## Browser

You can use [sql.js](https://sql.js.org) in the browser.

#### Webpack configuration

In the `browser` folder the package also includes a version compiled as a ES2015 module. If you want to use a different loader this is the point to start. Prior to TypeORM 0.1.7, the package is setup in a way that loaders like webpack will automatically use the `browser` folder. With 0.1.7 this was dropped to support Webpack usage in Node.js projects. This means, that the `NormalModuleReplacementPlugin` has to be used to insure that the correct version is loaded for browser projects. The configuration in your webpack config file, for this plugin looks like this:

```js
plugins: [
    ..., // any existing plugins that you already have
    new webpack.NormalModuleReplacementPlugin(/typeorm$/, function (result) {
        result.request = result.request.replace(/typeorm/, "typeorm/browser");
    }),
    new webpack.ProvidePlugin({
      'window.SQL': 'sql.js/dist/sql-wasm.js'
    })
]
```

and make sure [sql-wasm.wasm file](https://github.com/sql-js/sql.js/blob/master/README.md#downloadingusing) exists in your public path.

#### Example of configuration

```typescript
new DataSource({
    type: "sqljs",
    entities: [Photo],
    synchronize: true,
})
```

#### Don't forget to include reflect-metadata

In your main html page, you need to include reflect-metadata:

```html
<script src="./node_modules/reflect-metadata/Reflect.js"></script>
```

## Cordova / PhoneGap / Ionic apps

TypeORM is able to run on Cordova, PhoneGap, Ionic apps using the
[cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage) plugin
You have the option to choose between module loaders just like in browser package.
For an example how to use TypeORM in Cordova see [typeorm/cordova-example](https://github.com/typeorm/cordova-example) and for Ionic see [typeorm/ionic-example](https://github.com/typeorm/ionic-example). **Important**: For use with Ionic, a custom webpack config file is needed! Please checkout the example to see the needed changes. Note that there is currently no support for transactions when using the [cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage) plugin. See https://github.com/storesafe/cordova-sqlite-storage#other-limitations for more information.

## React Native

TypeORM is able to run on React Native apps using the [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) plugin. For an example see [typeorm/react-native-example](https://github.com/typeorm/react-native-example).

## Expo

TypeORM is able to run on Expo apps using the [Expo SQLite API](https://docs.expo.io/versions/latest/sdk/sqlite/). For an example how to use TypeORM in Expo see [typeorm/expo-example](https://github.com/typeorm/expo-example).

## NativeScript

1. `tns install webpack` (read below why webpack is required)
2. `tns plugin add nativescript-sqlite`
3. Create a DataSource in your app's entry point

    ```typescript
    import driver from "nativescript-sqlite"

    const dataSource = new DataSource({
        database: "test.db",
        type: "nativescript",
        driver,
        entities: [
            Todo, //... whatever entities you have
        ],
        logging: true,
    })
    ```

Note: This works only with NativeScript 4.x and above

_When using with NativeScript, **using webpack is compulsory**.
The `typeorm/browser` package is raw ES7 code with `import/export`
which will **NOT** run as it is. It has to be bundled.
Please use the `tns run --bundle` method_

Checkout example [here](https://github.com/championswimmer/nativescript-vue-typeorm-sample)!
