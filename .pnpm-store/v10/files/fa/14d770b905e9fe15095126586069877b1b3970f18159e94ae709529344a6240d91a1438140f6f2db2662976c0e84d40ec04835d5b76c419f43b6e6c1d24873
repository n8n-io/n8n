var Mexp=require('./postfix_evaluator.js');
Mexp.prototype.formulaEval = function () {
	"use strict";
	var stack=[],pop1,pop2,pop3;
	var disp=[];
	var temp='';
	var arr=this.value;
	for(var i=0;i<arr.length;i++){
		if(arr[i].type===1||arr[i].type===3){
			disp.push({value:arr[i].type===3?arr[i].show:arr[i].value,type:1});
		}
		else if(arr[i].type===13){
			disp.push({value:arr[i].show,type:1});
		}
		else if(arr[i].type===0){
			disp[disp.length-1]={value:arr[i].show+(arr[i].show!="-"?"(":"")+disp[disp.length-1].value+(arr[i].show!="-"?")":""),type:0};
		}
		else if(arr[i].type===7){
			disp[disp.length-1]={value:(disp[disp.length-1].type!=1?"(":"")+disp[disp.length-1].value+(disp[disp.length-1].type!=1?")":"")+arr[i].show,type:7};
		}
		else if(arr[i].type===10){
			pop1=disp.pop();
			pop2=disp.pop();
			if(arr[i].show==='P'||arr[i].show==='C')disp.push({value:"<sup>"+pop2.value+"</sup>"+arr[i].show+"<sub>"+pop1.value+"</sub>",type:10});
			else disp.push({value:(pop2.type!=1?"(":"")+pop2.value+(pop2.type!=1?")":"")+"<sup>"+pop1.value+"</sup>",type:1});
		}
		else if(arr[i].type===2||arr[i].type===9){
			pop1=disp.pop();
			pop2=disp.pop();
			disp.push({value:(pop2.type!=1?"(":"")+pop2.value+(pop2.type!=1?")":"")+arr[i].show+(pop1.type!=1?"(":"")+pop1.value+(pop1.type!=1?")":""),type:arr[i].type});
		}
		else if(arr[i].type===12){
			pop1=disp.pop();
			pop2=disp.pop();
			pop3=disp.pop();
			disp.push({value:arr[i].show+"("+pop3.value+","+pop2.value+","+pop1.value+")",type:12});
		}
	}
	return disp[0].value;
};
module.exports=Mexp;