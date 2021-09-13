import {
	IDataObject, INodeParameters,
} from 'n8n-workflow';


export async function mergeObjectProperties(base_props: [{ [key: string]: any }], new_props: INodeParameters[]) {
	if (new_props.length > 0) {
		if (base_props.length > 0) {
			base_props.forEach(function (base_prop: any, index: number) {
				new_props.forEach(function (new_prop: any, index: number) {
					//console.log(new_prop.name.toUpperCase())
					//console.log(base_prop.FieldName)
					if (base_prop.FieldName.toUpperCase() === new_prop.name.toUpperCase()) {
						console.log('Property Matched: ' + base_prop.FieldName)
						var valueField: string;
						switch (base_prop.FieldType) {
							case "N":
								valueField = 'FieldValueNumeric'
								break;
							case "S":
								valueField = 'FieldValueString'
								break;
							case "C":
								valueField = 'FieldValueCurrency'
								break;
							case "B":
								valueField = 'FieldValueBool'
								break;
							case "D":
								valueField = 'FieldValueDateTime'
								break;
							default:
								valueField = 'FieldValueString'
						}
						base_prop[valueField] = new_prop.value.toString();
					}
				})
			});
		}
	}
	return base_props
}