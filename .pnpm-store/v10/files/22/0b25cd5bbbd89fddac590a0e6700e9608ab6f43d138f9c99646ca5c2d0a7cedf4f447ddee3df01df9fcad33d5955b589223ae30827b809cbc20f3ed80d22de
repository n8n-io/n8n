type BluetoothServiceUUID = number | string;
type BluetoothCharacteristicUUID = number | string;
type BluetoothDescriptorUUID = number | string;

type BluetoothManufacturerData = Map<number, DataView>;
type BluetoothServiceData = Map<BluetoothServiceUUID, DataView>;

interface BluetoothDataFilter {
    readonly dataPrefix?: BufferSource | undefined;
    readonly mask?: BufferSource | undefined;
}

interface BluetoothManufacturerDataFilter extends BluetoothDataFilter {
    companyIdentifier: number;
}

interface BluetoothServiceDataFilter extends BluetoothDataFilter {
    service: BluetoothServiceUUID;
}

interface BluetoothLEScanFilter {
    readonly name?: string | undefined;
    readonly namePrefix?: string | undefined;
    readonly services?: BluetoothServiceUUID[] | undefined;
    readonly manufacturerData?: BluetoothManufacturerDataFilter[] | undefined;
    readonly serviceData?: BluetoothServiceDataFilter[] | undefined;
}

interface BluetoothLEScanOptions {
    readonly filters?: BluetoothLEScanFilter[] | undefined;
    readonly keepRepeatedDevices?: boolean | undefined;
    readonly acceptAllAdvertisements?: boolean | undefined;
}

interface BluetoothLEScan extends BluetoothLEScanOptions {
    active: boolean;
    stop: () => void;
}

type RequestDeviceOptions = {
    filters: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[] | undefined;
    optionalManufacturerData?: number[] | undefined;
} | {
    acceptAllDevices: boolean;
    optionalServices?: BluetoothServiceUUID[] | undefined;
    optionalManufacturerData?: number[] | undefined;
};

interface BluetoothAdvertisingEvent extends Event {
    readonly device: BluetoothDevice;
    readonly uuids: BluetoothServiceUUID[];
    readonly manufacturerData: BluetoothManufacturerData;
    readonly serviceData: BluetoothServiceData;
    readonly name?: string | undefined;
    readonly appearance?: number | undefined;
    readonly rssi?: number | undefined;
    readonly txPower?: number | undefined;
}

interface BluetoothRemoteGATTDescriptor {
    readonly characteristic: BluetoothRemoteGATTCharacteristic;
    readonly uuid: string;
    readonly value?: DataView | undefined;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothCharacteristicProperties {
    readonly broadcast: boolean;
    readonly read: boolean;
    readonly writeWithoutResponse: boolean;
    readonly write: boolean;
    readonly notify: boolean;
    readonly indicate: boolean;
    readonly authenticatedSignedWrites: boolean;
    readonly reliableWrite: boolean;
    readonly writableAuxiliaries: boolean;
}

interface CharacteristicEventHandlers {
    oncharacteristicvaluechanged: (this: this, ev: Event) => any;
}

interface BluetoothRemoteGATTCharacteristicEventMap {
    "characteristicvaluechanged": Event;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget, CharacteristicEventHandlers {
    readonly service: BluetoothRemoteGATTService;
    readonly uuid: string;
    readonly properties: BluetoothCharacteristicProperties;
    readonly value?: DataView | undefined;
    getDescriptor(descriptor: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor>;
    getDescriptors(descriptor?: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor[]>;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithResponse(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener<K extends keyof BluetoothRemoteGATTCharacteristicEventMap>(
        type: K,
        listener: (this: BluetoothRemoteGATTCharacteristic, ev: BluetoothRemoteGATTCharacteristicEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof BluetoothRemoteGATTCharacteristicEventMap>(
        type: K,
        listener: (this: BluetoothRemoteGATTCharacteristic, ev: BluetoothRemoteGATTCharacteristicEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

interface ServiceEventHandlers {
    onserviceadded: (this: this, ev: Event) => any;
    onservicechanged: (this: this, ev: Event) => any;
    onserviceremoved: (this: this, ev: Event) => any;
}

interface BluetoothRemoteGATTServiceEventMap {
    "serviceadded": Event;
    "servicechanged": Event;
    "serviceremoved": Event;
}

interface BluetoothRemoteGATTService extends EventTarget, CharacteristicEventHandlers, ServiceEventHandlers {
    readonly device: BluetoothDevice;
    readonly uuid: string;
    readonly isPrimary: boolean;
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>;
    getIncludedService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
    getIncludedServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
    addEventListener<K extends keyof BluetoothRemoteGATTServiceEventMap>(
        type: K,
        listener: (this: BluetoothRemoteGATTService, ev: BluetoothRemoteGATTServiceEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof BluetoothRemoteGATTServiceEventMap>(
        type: K,
        listener: (this: BluetoothRemoteGATTService, ev: BluetoothRemoteGATTServiceEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

interface BluetoothRemoteGATTServer {
    readonly device: BluetoothDevice;
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDeviceEventHandlers {
    onadvertisementreceived: (this: this, ev: BluetoothAdvertisingEvent) => any;
    ongattserverdisconnected: (this: this, ev: Event) => any;
}

interface WatchAdvertisementsOptions {
    signal?: AbortSignal;
}

interface BluetoothDeviceEventMap {
    "advertisementreceived": BluetoothAdvertisingEvent;
    "gattserverdisconnected": Event;
}

interface BluetoothDevice
    extends EventTarget, BluetoothDeviceEventHandlers, CharacteristicEventHandlers, ServiceEventHandlers
{
    readonly id: string;
    readonly name?: string | undefined;
    readonly gatt?: BluetoothRemoteGATTServer | undefined;
    forget(): Promise<void>;
    watchAdvertisements(options?: WatchAdvertisementsOptions): Promise<void>;
    readonly watchingAdvertisements: boolean;
    addEventListener<K extends keyof BluetoothDeviceEventMap>(
        type: K,
        listener: (this: BluetoothDevice, ev: BluetoothDeviceEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof BluetoothDeviceEventMap>(
        type: K,
        listener: (this: BluetoothDevice, ev: BluetoothDeviceEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

interface BluetoothEventMap {
    "availabilitychanged": Event;
    "advertisementreceived": BluetoothAdvertisingEvent;
}

interface Bluetooth
    extends EventTarget, BluetoothDeviceEventHandlers, CharacteristicEventHandlers, ServiceEventHandlers
{
    getDevices(): Promise<BluetoothDevice[]>;
    getAvailability(): Promise<boolean>;
    onavailabilitychanged: (this: this, ev: Event) => any;
    readonly referringDevice?: BluetoothDevice | undefined;
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
    requestLEScan(options?: BluetoothLEScanOptions): Promise<BluetoothLEScan>;
    addEventListener<K extends keyof BluetoothEventMap>(
        type: K,
        listener: (this: Bluetooth, ev: BluetoothEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof BluetoothEventMap>(
        type: K,
        listener: (this: Bluetooth, ev: BluetoothEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

declare namespace BluetoothUUID {
    function getService(name: string | number): string;
    function getCharacteristic(name: string | number): string;
    function getDescriptor(name: string | number): string;
    function canonicalUUID(alias: string | number): string;
}

interface Navigator {
    bluetooth: Bluetooth;
}
